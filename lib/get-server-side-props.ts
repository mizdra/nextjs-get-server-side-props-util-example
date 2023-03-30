import { ApolloClient, NormalizedCacheObject } from '@apollo/client';
import { GetServerSideProps, GetServerSidePropsContext } from 'next';

type TenantName = 'Tenant-A' | 'Tenant-B' | 'Tenant-C';

// getServerSideProps の共通化とは関係ないので実装は省略し、型だけ定義しておく
declare function getTenantNameFromHostHeader(context: GetServerSidePropsContext): TenantName | undefined;
export declare function createApolloClient(
  cache: NormalizedCacheObject | undefined,
  tenantName: TenantName,
  context?: GetServerSidePropsContext,
): ApolloClient<NormalizedCacheObject>;

/** `const outerGSSP = withTenantGSSP(innerGSSP)` の `outerGSSP` に渡される context の型 */
type WithTenantOuterContext = GetServerSidePropsContext;
/** `withTenantGSSP(innerGSSP)` の `innerGSSP` に渡される context の型 */
type WithTenantInnerContext = WithTenantOuterContext & { tenantName: TenantName };
/** `withTenantGSSP(innerGSSP)` の `innerGSSP` から返すべき pageProps の型 */
type WithTenantInnerPageProps = {};
/** `const outerGSSP = withTenantGSSP(innerGSSP)` の `outerGSSP` から返すべき pageProps の型 */
export type WithTenantOuterPageProps = WithTenantInnerPageProps & { tenantName: TenantName };

/**
 * Host ヘッダーからテナント名を取得し、innerGSSP にテナント名を渡す HoF。
 * また、テナント名をコンポーネントから参照できるよう、pageProps に焼き込む。
 */
function withTenantGSSP<P extends { [key: string]: any } = { [key: string]: any }>(
  innerGSSP: (context: WithTenantInnerContext) => ReturnType<GetServerSideProps<P & WithTenantInnerPageProps>>,
): (context: WithTenantOuterContext) => ReturnType<GetServerSideProps<P & WithTenantOuterPageProps>> {
  return async (context) => {
    const tenantName = getTenantNameFromHostHeader(context);
    if (tenantName === undefined) throw new Error('Host ヘッダーからテナントの特定に失敗しました。');
    const innerResult = await innerGSSP({ ...context, tenantName });
    if (!('props' in innerResult)) return innerResult;
    return {
      ...innerResult,
      props: {
        ...(await innerResult.props),
        tenantName,
      },
    };
  };
}

type WithApolloOuterContext = GetServerSidePropsContext & { tenantName: TenantName };
type WithApolloInnerContext = WithApolloOuterContext & { apolloClient: ApolloClient<NormalizedCacheObject> };
type WithApolloInnerPageProps = {};
export type WithApolloOuterPageProps = WithApolloInnerPageProps & { initialApolloState: NormalizedCacheObject };

/**
 * Apollo クライアントを innerGSSP に渡しつつ、Apollo クライアントのキャッシュを pageProps に焼き込む HoF。
 * 焼きこまれたキャッシュは、_app.tsx で Apollo クライアントを初期化する際に使われる。
 */
function withApolloGSSP<P extends { [key: string]: any } = { [key: string]: any }>(
  innerGSSP: (context: WithApolloInnerContext) => ReturnType<GetServerSideProps<P & WithApolloInnerPageProps>>,
): (context: WithApolloOuterContext) => ReturnType<GetServerSideProps<P & WithApolloOuterPageProps>> {
  return async (context) => {
    const apolloClient = createApolloClient(undefined, context.tenantName, context);
    const innerResult = await innerGSSP({ ...context, apolloClient });
    if (!('props' in innerResult)) return innerResult;
    return {
      ...innerResult,
      props: {
        ...(await innerResult.props),
        initialApolloState: apolloClient.cache.extract(),
      },
    };
  };
}

export type WithGlobalOuterContext = GetServerSidePropsContext;
export type WithGlobalInnerContext = WithTenantInnerContext & WithApolloInnerContext;
export type WithGlobalInnerPageProps = WithTenantInnerPageProps & WithApolloInnerPageProps;
export type WithGlobalOuterPageProps = WithTenantOuterPageProps & WithApolloOuterPageProps;
/** よく使われる HoF を合成した HoF */
export function withGlobalGSSP<P extends { [key: string]: any } = { [key: string]: any }>(
  innerGSSP: (context: WithGlobalInnerContext) => ReturnType<GetServerSideProps<P & WithGlobalInnerPageProps>>,
): (context: WithGlobalOuterContext) => ReturnType<GetServerSideProps<P & WithGlobalOuterPageProps>> {
  return withTenantGSSP(withApolloGSSP(innerGSSP));
}

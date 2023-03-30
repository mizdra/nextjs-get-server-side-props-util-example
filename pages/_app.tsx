import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ApolloProvider } from '@apollo/client';
import { createApolloClient, WithTenantOuterPageProps, WithApolloOuterPageProps } from '../lib/get-server-side-props';

// withGlobalGSSP などで囲われていれば、OuterPageProps 相当のプロパティが pageProps に入っているはず。
// ただしページによっては withGlobalGSSP などで囲ってなかったりするので、 Partial<> で optional にする
type CustomAppProps = AppProps<Partial<WithTenantOuterPageProps & WithApolloOuterPageProps>>;

export default function App({ Component, pageProps }: CustomAppProps) {
  if (!pageProps.tenantName) throw new Error('pageProps.tenantName is required.');
  const apolloClient = createApolloClient(pageProps.initialApolloState, pageProps.tenantName);
  return (
    <ApolloProvider client={apolloClient}>
      <Component {...pageProps} />
    </ApolloProvider>
  );
}

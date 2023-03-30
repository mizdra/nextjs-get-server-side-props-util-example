import { GetServerSideProps } from 'next';
import { withGlobalGSSP } from '../lib/get-server-side-props';
import { gql, useQuery } from '@apollo/client';

const QUERY = gql`
  query TopPage {
    hello
  }
`;

export default function Home() {
  const { loading, error, data } = useQuery(QUERY);
  return (
    <main>
      <p>top page.</p>
      <div>
        {loading && <p>loading...</p>}
        {error && <p>error: {error.message}</p>}
        {data && <p>data: {JSON.stringify(data)}</p>}
      </div>
    </main>
  );
}

export const getServerSideProps = withGlobalGSSP(async (context) => {
  await context.apolloClient.query({ query: QUERY });
  console.log(context.tenantName);
  return { props: {} };
}) satisfies GetServerSideProps;

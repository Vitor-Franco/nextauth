import {
  GetServerSideProps,
  GetServerSidePropsContext,
  GetServerSidePropsResult,
} from 'next';
import { destroyCookie, parseCookies } from 'nookies';
import { AuthTokenError } from '../services/errors/AuthTokenError';

export function withSSRAuth<P>(fn: GetServerSideProps<P>) {
  // Como recebemos uma função como parametro,
  // retornamos uma função também.

  return async (
    ctx: GetServerSidePropsContext
  ): Promise<GetServerSidePropsResult<P>> => {
    // Como estamos no server-side, precisamos passar o contexto da aplicação
    // Para que ele possa ter acesso aos valores dos cookies.
    const cookies = parseCookies(ctx);

    if (!cookies['@Rocketseat:NextAuth.token']) {
      return {
        redirect: {
          destination: '/',
          permanent: false,
        },
      };
    }

    try {
      return await fn(ctx);
    } catch (err) {
      if (err instanceof AuthTokenError) {
        destroyCookie(ctx, '@Rocketseat:NextAuth.token');
        destroyCookie(ctx, '@Rocketseat:NextAuth.refreshToken');

        return {
          redirect: {
            destination: '/',
            permanent: false,
          },
        };
      }
    }
  };
}

import axios, { AxiosError } from 'axios';
import { parseCookies, setCookie } from 'nookies';

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestsQueue = [];

export const api = axios.create({
  baseURL: 'http://localhost:3333',
  headers: {
    Authorization: `Bearer ${cookies['@Rocketseat:NextAuth.token']}`,
  },
});

// Interceptor age sobre toda requisição à nossa aplicação.
api.interceptors.response.use(
  // Se a requisição for status de sucesso, a retornamos.
  (response) => {
    return response;
  },
  // Se for status de erro, tratamos o erro para chegar no refreshToken, se for o caso.
  (error: AxiosError) => {
    if (error.response.status === 401) {
      // Identifica erro de token expirado
      if (error.response.data?.code === 'token.expired') {
        // renovar o token

        // -> atualiza os cookies novamente, agora dentro do if
        cookies = parseCookies();
        const { '@Rocketseat:NextAuth.refreshToken': refreshToken } = cookies;

        // Possui todas config da requisição que falhou. (para podermos refazer a chamada com as mesmas condições)
        const originalConfig = error.config;

        // Utilizamos a váriavel isRefreshing para evitar que duas requisições chamem o Refresh juntas
        if (!isRefreshing) {
          isRefreshing = true;
          api
            .post('/refresh', { refreshToken })
            .then((response) => {
              const { token } = response.data;

              setCookie(undefined, '@Rocketseat:NextAuth.token', token, {
                maxAge: 60 * 60 * 24 * 30, // 30 dias
                path: '/',
              });

              setCookie(
                undefined,
                '@Rocketseat:NextAuth.refreshToken',
                response.data.refreshToken,
                {
                  maxAge: 60 * 60 * 24 * 30, // 30 dias
                  path: '/',
                }
              );

              // Após o refresh atualizamos os headers das requisições
              api.defaults.headers['Authorization'] = `Bearer ${token}`;

              // Pegamos a fila das requisições que falharam por conta do token ter expirado,
              // E para cada uma delas, refazemos as requisições novamente.
              // Utilizando o método que setamos pra elas quando falharam e passando o token correto (atualizado).
              failedRequestsQueue.forEach((req) => req.onSuccess(token));
              failedRequestsQueue = [];
            })
            .catch((err) => {
              failedRequestsQueue.forEach((req) => req.onFailure(err));
              failedRequestsQueue = [];
            })
            .finally(() => {
              isRefreshing = false;
            });
        }

        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              originalConfig.headers['Authorization'] = `Bearer ${token}`;

              resolve(api(originalConfig));
            },
            onFailure: (err: AxiosError) => {
              reject(err);
            },
          });
        });
      } else {
        // deslogar o usuário
      }
    }
  }
);

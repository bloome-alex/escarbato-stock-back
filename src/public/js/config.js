export const appConfig = {
  dataProvider: window.PETSHOP_CONFIG?.dataProvider || 'local',
  backendUrl: window.PETSHOP_CONFIG?.backendUrl || '',
  username: window.PETSHOP_CONFIG?.username || '',
  password: window.PETSHOP_CONFIG?.password || ''
};

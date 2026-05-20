const defaultSections = {
  dashboard: true,
  proveedores: true,
  tipos: true,
  productos: true,
  metodosPago: true,
  cajas: true,
  ventas: true,
  mostrador: true,
  stock: true
};

const configuredSections = window.PETSHOP_CONFIG?.sections;

export const appConfig = {
  dataProvider: 'backend',
  backendUrl: window.PETSHOP_CONFIG?.backendUrl || '',
  username: window.PETSHOP_CONFIG?.username || '',
  password: window.PETSHOP_CONFIG?.password || '',
  sections: {
    ...defaultSections,
    ...(configuredSections && typeof configuredSections === 'object' ? configuredSections : {})
  }
};

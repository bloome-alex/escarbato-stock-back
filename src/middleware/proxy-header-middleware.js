import proxyaddr from 'proxy-addr';

export class ProxyHeaderMiddleware {
  constructor(config) {
    this.trustedProxyIps = config.trustedProxyIps || [];

    this.trustProxy = this.trustedProxyIps.length
      ? proxyaddr.compile(this.trustedProxyIps)
      : () => false;
  }

  configure(app) {
    app.set('trust proxy', this.trustProxy);
  }

  rejectUntrustedForwardedHeaders = (req, res, next) => {
    const hasForwardedHeaders = Boolean(
      req.headers['x-forwarded-for'] ||
      req.headers['x-real-ip']
    );

    const remoteAddress = req.socket?.remoteAddress;

    const trusted = remoteAddress
      ? this.trustProxy(remoteAddress, 0)
      : false;

    if (hasForwardedHeaders && !trusted) {
      return res.status(400).json({
        error: 'Headers de proxy no confiables',
        remoteAddress,
      });
    }

    next();
  };
}
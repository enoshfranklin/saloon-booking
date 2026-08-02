function getAdminSecret() {
  return process.env.ADMIN_SECRET || '';
}

function getRequestSecret(req) {
  return req.headers['x-admin-secret'] || req.headers['x-admin-token'] || '';
}

function isAdmin(req) {
  const secret = getRequestSecret(req);
  const adminSecret = getAdminSecret();
  return adminSecret !== '' && secret === adminSecret;
}

module.exports = { isAdmin };

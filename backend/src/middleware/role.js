/**
 * Middleware pembatas akses berdasarkan role.
 * Contoh penggunaan: allowRoles('KETUA', 'SEKRETARIS', 'BENDAHARA')
 */
function allowRoles(...rolesYangDiizinkan) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Belum terautentikasi.' });
    }

    if (!rolesYangDiizinkan.includes(req.user.role)) {
      return res.status(403).json({
        message: `Akses ditolak. Fitur ini hanya untuk role: ${rolesYangDiizinkan.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = allowRoles;

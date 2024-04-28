const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './config/.env.local' });

module.exports = (req, res, next) => {
    // RÉCUPÉRER LE TOKEN DE L'UTILISATEUR DEPUIS LES COOKIES
    const token = req.cookies.token;

    // VÉRIFIER SI LE TOKEN EXISTE SI NON REDIRECTION
    if (!token) {
      return res.status(401).render('login', { message: 'Vous devez être connecté pour accéder à cette page.' });
    }

    // VERIFICATION DU TOKEN EXISTANT
    try {
      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // Ajouter les informations de l'utilisateur à la requête
      req.user = decoded;
      // Passer à l'étape suivante
      next();
    } catch (err) {
      res.clearCookie('token');
      res.status(400).render('login', { message: 'Votre session a expiré. Veuillez vous reconnecter.' });
    }
}
const express = require('express');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { Cities, Users, Products } = require('./models/db_models');
require('dotenv').config({ path: './config/.env.local' });


const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

const verifyToken = require('./middleware/jwt_check');

/*********************************************
 *               ROUTE API                   *
 *********************************************/

app.post('/api/register', async (req, res) => {
    try {
        const { user_name, user_email, user_phone, user_fname, user_lname, user_password, user_city, user_adress } = req.body;

        const city = await Cities.findOne({ where: { id: user_city } });

        if (!city) {
            return res.status(400).render('register', { message: 'La ville sélectionnée n\'existe pas.' });
        }

        const hashedPassword = await bcryptjs.hash(user_password, 10);

        await Users.create({
            user_name,
            user_email,
            user_phone,
            user_fname,
            user_lname,
            user_password: hashedPassword,
            user_adress,
            user_city: city.id 
        });

        res.render('login', { message: 'Inscription réussie. Vous pouvez maintenant vous connecter.' });
    } catch (error) {
        console.error(error);
        res.status(500).render('register', { message: 'Une erreur est survenue lors de l\'inscription.' });
    }
});


app.post('/api/login', async (req, res) => {
    try {
        const { user_email, user_password } = req.body;

        const user = await Users.findOne({ where: { user_email } });
        if (!user) {
            return res.status(400).render('login', { message: 'L\'utilisateur n\'existe pas.' });
        }

        const isPasswordValid = await bcryptjs.compare(user_password, user.user_password);
        if (!isPasswordValid) {
            return res.status(400).render('login', { message: 'Le mot de passe est incorrect.' });
        }

        // GÉNÉRER UN TOKEN JWT
        const token = jwt.sign({ user_id: user.user_id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // TOKEN DANS COOKIE
        res.cookie('token', token, { httpOnly: true });

        // REDIRIGER L'UTILISATEUR VERS LA PAGE DES PRODUITS
        res.redirect('/products');
    } catch (error) {
        console.error(error);
        res.status(500).render('login', { message: 'Une erreur est survenue lors de la connexion.' });
    }
});

app.get('/api/logout', (req, res) => {
    // SUPPRIMER LE COOKIE CONTENANT LE TOKEN
    res.clearCookie('token');
    res.render('login', { message: 'Vous avez été déconnecté.' });
});

app.post('/api/create/products/', verifyToken,async (req, res) => {
    try {
        const { product_name, product_description, dossier, in_stock, price, brand } = req.body;

        // Créer le produit dans la base de données
        await Products.create({
            product_name,
            product_description,
            dossier,
            in_stock,
            price,
            brand,
        });

        res.redirect('/products');
    } catch (error) {
        console.error(error);
        res.status(500).render('createProduct', { message: 'Une erreur est survenue lors de l\'ajout du produit.' });
    }
});

app.post('/api/edit/products/:productId', verifyToken, async (req, res) => {
    try {
        const productId = req.params.productId;
        const { product_name, product_description, in_stock, price, brand } = req.body;

        // METTRE À JOUR LES INFORMATIONS DU PRODUIT DANS LA BASE DE DONNÉES
        const updatedProduct = await Products.update({
            product_name,
            product_description,
            in_stock,
            price,
            brand
        }, {
            where: { product_id: productId }
        });

        res.redirect('/products');
    } catch (error) {
        console.error(error);
        res.status(500).render('editProduct', { message: 'Une erreur est survenue lors de la modification du produit.' });
    }
});

app.post('/api/products/delete/:productId', verifyToken, async (req, res) => {
    try {
        const productId = req.params.productId;

        // Supprimer le produit de la base de données
        await Products.destroy({ where: { product_id: productId } });

        res.redirect('/products');
    } catch (error) {
        console.error(error);
        res.status(500).render('products', { message: 'Une erreur est survenue lors de la suppression du produit.' });
    }
});


/*********************************************
 *               ROUTE FRONT                 *
 *********************************************/

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/register', async (req, res) => {
    try {
        const cities = await Cities.findAll(); // Récupérer toutes les villes de la base de données
        res.render('register', { cities, message: ''});
    } catch (error) {
        console.error(error);
        res.status(500).render('register', { message: 'Une erreur est survenue lors de la récupération des villes.' });
    }
});

app.get('/login', (req, res) => {
    res.render('login', { message: '' });
});

app.get('/products', verifyToken, async (req, res) => {
    try {
      const page = req.query.page || 1;
      const limit = 100;
      const offset = (page - 1) * limit;

      const totalCount = await Products.count();

      const products = await Products.findAll({ limit, offset });

        const user_id = req.user.user_id;
        const user = await Users.findOne({ where: { user_id } });
        const user_name = user.user_name;

      res.render('products', { user_name, products, totalCount, limit, page, message: '' });
    } catch (error) {
      console.error(error);
      res.status(500).render('products', { message: 'Une erreur est survenue lors de la récupération des produits.' });
    }
});

app.get('/products/create', verifyToken, async (req, res) => {
    try {
        res.render('createProduct');
    } catch (error) {
        console.error(error);
        res.status(500).render('error', { message: 'Une erreur est survenue lors de l\'affichage du formulaire de création.' });
    }
});

app.get('/products/edit/:productId', verifyToken, async (req, res) => {
    try {
        const productId = req.params.productId;

        const product = await Products.findByPk(productId);

        if (!product) {
            return res.status(404).render('products', { message: 'Produit non trouvé.' });
        }

        res.render('editProduct', { product });
    } catch (error) {
        console.error(error);
        res.status(500).render('products', { message: 'Une erreur est survenue lors de la récupération du produit.' });
    }
});


app.listen(3000, () => {
    console.log(`Server is running on port ${3000}`);
});

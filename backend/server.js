/**
 * MERN BOOKSTORE – API v1 (Laboratorul 2)
 * Server Express.js pentru catalogul de cărți.
 *
 * Funcționalități:
 * - GET / și GET /api
 * - GET /api/products
 * - GET /api/products/:id
 * - Tratarea erorilor 404 și 500
 */

// 1. Încărcăm variabilele de mediu
require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// 2. Configurare
const app = express();
const PORT = process.env.PORT || 3000;

const CORS_ORIGIN = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

// Calea către fișierul cu produse
const PRODUCTS_FILE = path.join(__dirname, 'data', 'books.json');

// 3. Middleware
app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(compression());
app.use(express.json());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

/**
 * FUNCȚII HELPER PENTRU DATE
 */

// Citește catalogul complet
const readCatalog = () => {
  try {
    const data = fs.readFileSync(PRODUCTS_FILE, 'utf8');
    const parsed = JSON.parse(data);

    return {
      products: parsed.products || [],
      metadata: parsed.metadata || {}
    };
  } catch (error) {
    console.error('Eroare la citirea catalogului:', error.message);
    return { products: [], metadata: {} };
  }
};

// Returnează doar lista de produse
const readProducts = () => readCatalog().products;

// Salvează produsele și actualizează metadatele
const saveProducts = (products) => {
  const { metadata } = readCatalog();
  const now = new Date().toISOString();

  const data = {
    products,
    metadata: {
      ...metadata,
      totalProducts: products.length,
      lastUpdated: now
    }
  };

  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(data, null, 2));
};

/**
 * RUTE PENTRU PRODUSE
 */

// GET /api/products – toate produsele active
app.get('/api/products', (req, res) => {
  try {
    const { category } = req.query;

    let products = readProducts().filter(
      (p) => p.isActive === true
    );

    if (category) {
      products = products.filter(
        (p) => p.category.toLowerCase() === category.toLowerCase()
      );
    }

    res.json({
      success: true,
      products,
      total: products.length,
      filters: { category: category || null }
    });
  } catch (error) {
    console.error('Eroare la obținerea produselor:', error);
    res.status(500).json({
      success: false,
      message: 'Eroare server'
    });
  }
});

// GET /api/products/:id – un singur produs activ
app.get('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      success: false,
      message: 'ID invalid'
    });
  }

  const product = readProducts().find(
    (p) => p.id === id && p.isActive === true
  );

  if (!product) {
    return res.status(404).json({
      success: false,
      message: 'Produsul nu a fost găsit'
    });
  }

  res.json({ success: true, product });
});

// GET / și GET /api – informații despre API
const apiInfo = (req, res) => {
  res.json({
    message: 'MERN BookStore API v1',
    description: 'API pentru catalogul de cărți',
    version: '1.0.0',
    endpoints: {
      'GET /api/products': 'Toate produsele active',
      'GET /api/products?category=React': 'Filtrare după categorie',
      'GET /api/products/:id': 'Un singur produs'
    },
    author: 'SDBIS'
  });
};

app.get('/', apiInfo);
app.get('/api', apiInfo);

/**
 * TRATAREA ERORILOR
 */

// 404 – Rută inexistentă
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.method} ${req.originalUrl} nu există`
  });
});

// 500 – Middleware de eroare
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'JSON invalid în corpul cererii'
    });
  }

  console.error('Eroare neprevăzută:', err);

  res.status(500).json({
    success: false,
    message: 'Eroare internă a serverului'
  });
});

// Pornirea serverului
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log('\nMERN BookStore API v1');
    console.log(`Serverul rulează pe: http://localhost:${PORT}`);
    console.log(`Produse: http://localhost:${PORT}/api/products\n`);
  });
}

// Exportăm aplicația pentru testare
module.exports = app;
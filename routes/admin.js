var express = require('express');
const { route } = require('./user');
var router = express.Router();
var productHelper = require('../Helpers/product-helpers');
const { render, response } = require('../app');
const { Db } = require('mongodb');
const productHelpers = require('../Helpers/product-helpers');
const adminHelpers = require('../Helpers/admin-helpers');
const verifyLogin = (req, res, next) => {
  if (req.session.adminloggedIn) {
    next()
  } else {
    res.redirect('/admin/login')
  }
}

/* GET admin listing. */

router.get('/', verifyLogin, async function (req, res, next) {
  await productHelper.getAllProducts().then(async (products) => {
    let orders = await adminHelpers.canceledOrders()
    let helper = await adminHelpers.findHelper(req.session.admin._id)
    numberOfCancel = orders.length - helper
    res.render('admin/view-products', { admin: true, products, admin_name: req.session.admin, admin_id: req.session.admin._id, numberOfCancel , pageName: "Admin Panel"})

  })


});
router.get('/add-product', verifyLogin, (req, res) => {
  res.render('admin/add-product', { admin: true, admin_name: req.session.admin, pageName: "Add Product"})
})

router.post('/add-product', (req, res) => {
  productHelper.addProduct(req.body, (id) => {
    let image = req.files.Image
    image.mv('./public/product-images/' + id + '.jpg', (err, done) => {
      if (!err) {
        res.render('admin/add-product', { admin: true, admin_name: req.session.admin})
      } else
        console.log(err)
    })
    res.render('admin/add-product', { admin: true,admin_name: req.session.admin })
  })
})

router.get('/delete-product/:id', (req, res) => {
  let productId = req.params.id
  productHelper.deleteProduct(productId).then((response) => {
    res.redirect('/admin')
  })
})

router.get('/edit-product/:id', verifyLogin, async (req, res) => {
  let productId = req.params.id
  let product = await productHelper.getOneProduct(productId)
  res.render('admin/edit-product', { admin: true, product, pageName: "Edit Product", admin_name: req.session.admin, pageName: "Edit Product" })
})


router.post('/edit-product/:id', (req, res) => {
  let image = './public/product-images/' + req.params.id + '.jpg'
  productHelper.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin')
    image = req.files.Image
    if (image) {
      image.mv('./public/product-images/' + req.params.id + '.jpg',)
    } else {
      res.redirect('/admin')
    }
  })


})

router.get('/user-list', verifyLogin, (req, res) => {
  adminHelpers.getAllUsers().then((users) => {
    res.render('admin/user-list', { admin: true, users, admin_id: req.session.admin, pageName: "User List", admin_name: req.session.admin })
  })
})

router.get('/orders', verifyLogin, async (req, res) => {
  let orders = await adminHelpers.getAllOrders()
  res.render('admin/order-list', { admin: true, orders, admin_id: req.session.admin,  pageName: "Order List",admin_name: req.session.admin })
})
router.post('/change-status', (req, res) => {
  adminHelpers.changeOrderStatus(req.body).then((response) => {
    res.json({ status: true })
  })
})

router.get('/login', async (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin')
  } else {
    res.render('admin/login', { pageName: "Admin Login", loginErr: req.session.adminloginErr, admin: true })
    req.session.adminloginErr = false
  }
})
router.post('/login', (req, res) => {
  adminHelpers.adminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin
      req.session.adminloggedIn = true
      adminHelpers.cancelHelper(req.session.admin._id).then(() => {

        res.redirect('/admin')
      })
    } else {
      req.session.adminloginErr = "Invalid username or password"
      res.redirect('/admin/login')
    }

  })

})
router.get('/logout', (req, res) => {
  req.session.admin = null
  req.session.adminloggedIn = false
  res.redirect('/admin')
})

router.get('/canceled-orders', verifyLogin, async (req, res) => {
  await adminHelpers.changeHelper(req.session.admin._id)
  let orders = await adminHelpers.canceledOrders()
  res.render('admin/canceled-orders', { admin: true, orders, pageName: "Canceled Orders", admin_id: req.session.admin._id, admin_name: req.session.admin })
})
module.exports = router;
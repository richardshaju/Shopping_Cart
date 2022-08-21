var express = require('express');
const { response } = require('../app');
const adminHelpers = require('../Helpers/admin-helpers');
var router = express.Router();
var productHelper = require('../Helpers/product-helpers');
const userHelpers = require('../Helpers/user-helpers');
const verifyLogin = (req, res, next) => {
  if (req.session.userloggedIn) {
    next()
  } else {
    res.redirect('/login')
  }
}



/* GET home page. */

router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartCount = null
  if (user) {
    cartCount = await userHelpers.getCartCount(user._id)
  } else {
  }
  let values = ["Mobiles", "Laptops", "Electronics", "Appliances", "Camera", "Home", "Toys", "Fashion", "Shoes", "For Babies", "Books", "Sports"]
  res.render('./user/index', { admin: false, user, cartCount, pageName: "Cartmax", values });
  //console.log(values.slice(0,1))

});

router.get('/login', (req, res) => {
  let login = true
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('user/login', { "loginErr": req.session.userloginErr, pageName: "Login", login })
    req.session.userloginErr = false
  }
})


router.get('/signup', (req, res) => {
  let signup = true
  res.render('user/signup', { signup , pageName: "Signup"})
})

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    req.session.user = response.user
    req.session.userloggedIn = true
    res.redirect('/')
  })
})

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.userloggedIn = true
      res.redirect('/')
    } else {
      req.session.userloginErr = "Invalid username or password"
      res.redirect('/login')
    }
  })
})

router.get('/logout', (req, res) => {
  req.session.user = null
  req.session.userloggedIn = false
  res.redirect('/')
})

router.get('/cart', verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id)
  console.log(products);
  var total = await userHelpers.getTotalAmount(req.session.user._id)
  console.log(total);
  var mobiles = false
 
  if (Number.isInteger(total)) {
    var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "June",
      "July", "Aug", "Sept", "Oct", "Nov", "Dec"
    ];
    let today = new Date()
    let date = today.getDate() + ' ' + months[today.getMonth()] + ',' + days[today.getDay()]
    res.render('user/cart', { cart: true, products, user: req.session.user, total, date, pageName: "Cart"})
  } 
  else {
    let nullCart = total
    res.render('user/cart', { cart: true, user: req.session.user, nullCart, pageName: "Cart" })
  }
})
router.get('/add', (req, res, next) => {
  if (req.session.userloggedIn) {
    res.json({ status: false, })
  } else {
    res.json({ status: true, })
  }
})

router.get('/add-to-cart/:id', (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true, })
  })
})
router.post('/change-product-quantity', (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.userId)
    response.value = await userHelpers.getMultipliedValue(req.body.userId, req.body.product)
    console.log(response);
    res.json(response)
  })
})


router.post('/remove-product', (req, res) => {
  console.log("Called");
  userHelpers.removeCartProduct(req.body).then((response) => {
    res.json(response)
  })
})
router.get('/place-order', verifyLogin, async (req, res) => {

  let total = await userHelpers.getTotalAmount(req.session.user._id)
  res.render('user/place-order', { total, user: req.session.user, cart: true, pageName: "Place Order" })

})

router.post('/place-order', async (req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if (req.body['payment-method'] === 'COD') {
      res.json({ codSuccess: true })
    } else {
      userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
        res.json(response)
      })
    }
  })
})

router.get('/order-success', (req, res) => {
  res.render('user/order-success', { cart: true, pageName: "Order Success"})
})

router.get('/orders', verifyLogin, async (req, res) => {
  await userHelpers.getUserOrders(req.session.user._id).then((orders) => {
    res.render('user/orders', { orders, user: req.session.user, order: true , pageName: "Orders"})
  })

})

router.get('/view-order-products/:id', async (req, res) => {
  let products = await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products', { products, user: req.session.user ,pageName: "Ordered Products" })
})
router.post('/verify-payment', (req, res) => {
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(() => {
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(() => {
      res.json({ status: true })
    })
  }).catch((err) => {
    console.log(err);
    res.json({ status: false, errMsg: "" })
  })
})
router.get('/products/:id', async (req, res) => {
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  var laptop = false
  var fashion = false
  let products = await userHelpers.getRequiredProducts(req.params.id)
  if (req.params.id == "Laptops" || req.params.id == "Appliances" || req.params.id == "Camera"|| req.params.id == "Toys")  {
    laptop = true
  } else if (req.params.id == "Fashion") {
    fashion = true
  }
  res.render('user/products', { laptop, fashion, products, cartCount, user: req.session.user, admin: false, pageName: "Products" })
})
router.post('/cancel-order', async (req, res) => {
  await userHelpers.cancelOrder(req.body).then((response) => {
    res.json({ status: true })
  })

})
module.exports = router;

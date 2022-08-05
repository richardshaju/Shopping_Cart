var express = require('express');
const { response } = require('../app');
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
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelper.getAllProducts().then((products) => {
    let values = ["Mobiles","Laptops","Electronics","Appliances","Camera","Home","Toys","Fashion","Shoes","For Babies","Books","Sports"]
    res.render('./user/index', { products, admin: false, user, cartCount ,pageName:"Shopping Cart",values});
  })

});

router.get('/login', (req, res) => {
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('user/login', { "loginErr": req.session.userloginErr,pageName:"Login" })
    req.session.userloginErr = false
  }
})


router.get('/signup', (req, res) => {
  res.render('user/signup')
})

router.post('/signup', (req, res) => {
  userHelpers.doSignup(req.body).then((response) => {
    req.session.user = response
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
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  if(Number.isInteger(total)){
    res.render('user/cart', { products, user: req.session.user,total })
  }else{
    let nullCart = total
    res.render('user/cart', { products, user: req.session.user,nullCart })
  }
})
router.get('/add', (req, res,next) => {
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
  userHelpers.changeProductQuantity(req.body).then(async(response) => {
    response.total = await userHelpers.getTotalAmount(req.body.userId)
    res.json(response)
  })
})
router.post('/remove-product',(req,res)=>{
  console.log("Called");
  userHelpers.removeCartProduct(req.body).then((response)=>{
    res.json(response)
  })
})
router.get('/place-order', verifyLogin, async(req,res)=>{
  let total = await userHelpers.getTotalAmount(req.session.user._id)
    res.render('user/place-order',{total,user:req.session.user})

})

router.post('/place-order',async(req,res)=>{
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
    if (req.body['payment-method'] === 'COD') {
      res.json({ codSuccess: true })
    }else{
      userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
        res.json(response)
      })
    }
  })
})

router.get('/order-success',(req,res)=>{
  res.render('user/order-success')
})
router.get('/orders',verifyLogin , async(req,res)=>{
  let orders = await userHelpers.getUserOrders(req.session.user._id)
  res.render('user/orders',{orders,user:req.session.user})
})
router.get('/view-order-products/:id',async(req,res)=>{
  let products = await userHelpers.getOrderProducts(req.params.id)
  res.render('user/view-order-products',{products,user:req.session.user})
})
router.post('/verify-payment',(req,res)=>{
  console.log(req.body);
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body[ 'order[receipt]']).then(()=>{
      res.json({status:true})
    })
  }).catch((err)=>{
    console.log(err);
    res.json({status:false,errMsg:""})
  })
})
router.get('/products/:id',async (req,res)=>{
  console.log(req.params.id);
  let cartCount = null
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  var laptop = false
  var fashion = false
  let products = await userHelpers.getRequiredProducts(req.params.id)
  if(req.params.id == "Laptops"){
    laptop = true
  }else if(req.params.id == "Fashion"){
    fashion = true
  }
  res.render('user/products',{laptop,fashion,products,cartCount,user:req.session.user,admin:false})
})
module.exports = router;

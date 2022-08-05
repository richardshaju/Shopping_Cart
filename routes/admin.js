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

router.get('/', verifyLogin,function(req, res, next) {

  productHelper.getAllProducts().then((products)=>{
  //console.log(products)
    res.render('admin/view-products',{admin:true,products});
  })

 

});
router.get('/add-product',verifyLogin,(req,res)=>{
  res.render('admin/add-product',{admin:true,})
})

router.post('/add-product',verifyLogin,(req,res)=>{
  productHelper.addProduct(req.body ,(id)=>{
    let image = req.files.Image
    image.mv('./public/product-images/'+id+'.jpg',(err,done)=>{
      if(!err){
        res.render('admin/add-product')
      }else
        console.log(err)
    })
    res.render('admin/add-product')
  })
})

router.get('/delete-product/:id',(req,res)=>{
    let productId = req.params.id
    productHelper.deleteProduct(productId).then((response)=>{
      res.redirect('/admin')
    })
})

router.get('/edit-product/:id',verifyLogin,async (req,res)=>{
  let productId = req.params.id
  let product = await productHelper.getOneProduct(productId)
    res.render('admin/edit-product',{product,pageName:"Edit Product"})
    })
module.exports = router;

router.post('/edit-product/:id',(req,res)=>{
  let image ='./public/product-images/'+req.params.id+'.jpg'
  productHelper.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin')
    image = req.files.Image
    if(image){
      image.mv('./public/product-images/'+req.params.id+'.jpg',)
    }else{
      res.redirect('/admin')
    }
  })


})

router.get('/user-list',(req,res)=>{
    adminHelpers.getAllUsers().then((users)=>{
      res.render('admin/user-list',{admin:true,users})
  })
})  

router.get('/orders',verifyLogin,async(req,res)=>{
  let orders = await adminHelpers.getAllOrders()
    res.render('admin/order-list',{admin:true,orders})
})
router.post('/change-status',(req,res)=>{
  adminHelpers.changeOrderStatus(req.body).then((response)=>{
    res.json({status:true})
  })
})

router.get('/login',(req,res)=>{
  if(req.session.admin){
    res.redirect('/admin')
  }else{
    res.render('admin/login',{pageName:"Admin Login",loginErr:req.session.adminloginErr})
    req.session.adminloginErr = false
  }
})
router.post('/login',(req,res)=>{
  adminHelpers.adminLogin(req.body).then((response)=>{
    if (response.status) {
      req.session.admin = response.admin
      req.session.adminloggedIn = true
      res.redirect('/admin')
    } else {
      req.session.adminloginErr = "Invalid username or password"
      res.redirect('/admin/login')
    }
   
  })
 
})
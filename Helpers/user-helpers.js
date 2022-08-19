var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { response } = require('express')
var ObjectId = require('mongodb').ObjectId
const Razorpay = require('razorpay');
const { resolve } = require('path')
const { ObjectID } = require('bson')

var instance = new Razorpay({
    key_id: 'rzp_test_gH3E6VcBhdvtDA',
    key_secret: 'dzeGE7uKT1JXnBvJ66J0oJqi',
});

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data.insertedId)
            })

        })
    },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email })
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        response.user = user
                        response.status = true
                        resolve(response)
                        console.log('Login Sucess')
                    } else {
                        console.log("login canceled")
                        resolve({ status: false })
                    }

                })
            } else {
                response.status = false
                console.log("login canceled")
                resolve({ status: false })
            }
        })
    },

    addToCart: (productId, userId) => {
        let proObj = {
            item: ObjectId(productId),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (userCart) {
                let proExist = userCart.products.findIndex(product => product.item == productId)
                console.log(proExist);
                if (proExist != -1) {
                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: ObjectId(userId), 'products.item': ObjectId(productId) },
                        {
                            $inc: { 'products.$.quantity': 1 }
                        }).then(() => {
                            resolve()
                        })
                } else {

                    db.get().collection(collection.CART_COLLECTION).updateOne({ user: ObjectId(userId) },
                        {
                            $push: {
                                products: proObj
                            }
                        }
                    ).then((response) => {
                        resolve()
                    })
                }
            } else {
                let cartObj = {
                    user: ObjectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response) => {
                    resolve()
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (cart) {
                if (cart.products.length > 0) {
                    let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                        {
                            $match: { user: ObjectId(userId) }
                        },
                        {
                            $unwind: '$products'
                        },
                        {
                            $project: {
                                item: '$products.item',
                                quantity: '$products.quantity'
                            }
                        },
                        {
                            $lookup: {
                                from: collection.PRODUCT_COLLECTION,
                                localField: 'item',
                                foreignField: '_id',
                                as: 'product'
                            }
                        },
                        {
                            $project: {
                                item: 1, quantity: 1, products: { $arrayElemAt: ['$product', 0] }
                            }
                        },
                        {
                            $project: {
                                item: 1, quantity: 1, products: 1, total: { $multiply: ['$quantity', { $convert: { input: '$products.Price', to: 'int' } }] }
                            }
                        }
                        //   {
                        //       $lookup: {
                        //           from: collection.PRODUCT_COLLECTION,
                        //           let: { proList: '$products' },
                        //           pipeline: [
                        //               {
                        //                   $match: {
                        //                       $expr: {
                        //                           $in:['$_id',"$$proList"]
                        //                       }
                        //                   }
                        //               }
                        //           ],
                        //           as:'cartItems'
                        //       }
                        //   }
                    ]).toArray()
                    //console.log(cartItems[0].products);
                    resolve(cartItems)

                } else {
                    let value = "No products in Cart"
                    resolve(value)
                }
            } else {
                let value = "No products in Cart"
                resolve(value)
            }
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (cart) {
                if (cart.products.length > 0) {
                    let count = await db.get().collection(collection.CART_COLLECTION).aggregate([
                        {
                            $match: { user: ObjectId(userId) }
                        },
                        {
                            $unwind: '$products'
                        },
                        {
                            $project: {
                                item: '$products.item',
                                quantity: '$products.quantity'
                            }
                        },
                        {
                            $lookup: {
                                from: collection.PRODUCT_COLLECTION,
                                localField: 'item',
                                foreignField: '_id',
                                as: 'product'
                            }
                        },
                        {
                            $project: {
                                item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                count: { $sum: '$quantity' }
                            }
                        }
                    ]).toArray()
                    resolve(count[0].count)
                    
                }
                else {
                    let count = 0
                    resolve(count)
                }
            } else {
                let count = 0
                resolve(count)
            }
        })
    },
    changeProductQuantity: (details) => {
        details.count = parseInt(details.count)
        details.quantity = parseInt(details.quantity)
        return new Promise((resolve, reject) => {
            if (details.count == -1 && details.quantity == 1) {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: ObjectId(details.cart), 'products.item': ObjectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': 0 }
                    })
                    .then((response) => {
                        resolve({ removeProduct: true })
                    })
            } else {
                db.get().collection(collection.CART_COLLECTION).updateOne({ _id: ObjectId(details.cart), 'products.item': ObjectId(details.product) },
                    {
                        $inc: { 'products.$.quantity': details.count }
                    }).then((response) => {
                        resolve({ status: true })
                    })
            }
        })
    },
    removeCartProduct: (details) => {
        let productId = details.productId
        let cartId = details.cartId
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CART_COLLECTION).updateOne({ _id: ObjectId(cartId) },
                {
                    $pull: {
                        products: { item: ObjectId(productId) }
                    }
                }).then((response) => {
                    resolve({ status: true })
                })
        })
    },
    getTotalAmount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (cart) {
                if (cart.products.length > 0) {
                    let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                        {
                            $match: { user: ObjectId(userId) }
                        },
                        {
                            $unwind: '$products'
                        },
                        {
                            $project: {
                                item: '$products.item',
                                quantity: '$products.quantity'
                            }
                        },
                        {
                            $lookup: {
                                from: collection.PRODUCT_COLLECTION,
                                localField: 'item',
                                foreignField: '_id',
                                as: 'product'
                            }
                        },
                        {
                            $project: {
                                item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                total: { $sum: { $multiply: ['$quantity', { $convert: { input: '$product.Price', to: 'int' } }] } }
                            }
                        }

                    ]).toArray()
                    resolve(total[0].total)
                }else{
                    let value = "No products in Cart"
                    resolve(value)
                }
            } else {
                let value = "No products in Cart"
                resolve(value)
            }
        })
    },
    placeOrder: (details, products, total) => {
        return new Promise((resolve, reject) => {
            console.log(details, products, total);
            let status = details['payment-method'] === 'COD' ? 'Placed' : 'Pending'
            let today = new Date()
            let orderObj = {
                date: today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate(),
                time: today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds(),
                deliveryDetails: {
                    mobile: details.mobile,
                    address: details.address,
                    pincode: details.pincode
                },
                userId: ObjectId(details.userId),
                paymentMethod: details['payment-method'],
                totalPrice: total,
                products: products,
                status: status,
                placed: true,
                helper: false
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).deleteOne({ user: ObjectId(details.userId) })
                resolve(response.insertedId)
            })

        })
    },
    getCartProductList: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            resolve(cart.products)
        })
    },
    getUserOrders: (userId) => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find({ userId: ObjectId(userId) }).sort({ _id: -1 }).toArray()
            resolve(orders)
        })

    },
    getOrderProducts: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let orderItems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: ObjectId(orderId) }
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }
                },
                {
                    $project: {
                        item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                    }
                }
            ]).toArray()

            resolve(orderItems)
        })
    },
    generateRazorpay: (orderId, totalPrice) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: totalPrice * 100,
                currency: "INR",
                receipt: "" + orderId,
            }
            instance.orders.create(options, (err, order) => {
                console.log("new order : ", order);
                resolve(order)
            })
        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto')
            let hmac = crypto.createHmac("sha256", 'dzeGE7uKT1JXnBvJ66J0oJqi')
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }
        })
    },
    changePaymentStatus: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(orderId) },
                {
                    $set: {
                        status: 'Placed'
                    }
                }).then(() => {
                    resolve()
                })
        })
    },
    getRequiredProducts: (category) => {
        return new Promise(async (resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION)
                .find(
                    {
                        Category: category
                    }
                ).toArray()
            resolve(products)
            console.log(products);
        })
    },
    getMultipliedValue: (userId, productId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (cart.products.length > 0) {
                let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: ObjectId(userId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $match: { item: ObjectId(productId) }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                        }
                    },
                    {
                        $project: {
                            total: { $multiply: ['$quantity', { $convert: { input: '$product.Price', to: 'int' } }] }
                        }
                    }

                ]).toArray()
                resolve(total[0].total)
            } else {
                let value = "No products in Cart"
                resolve(value)
            }
        })
    },
    getQuantity: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userId) })
            if (cart.products.length > 0) {
                let quantity = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: ObjectId(userId) }
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity: '$products.quantity'
                        }
                    },
                    {
                        $match: { item: ObjectId(productId) }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, product: { $arrayElemAt: ['$product', 0] }
                        }
                    },
                ]).toArray()
                console.log(quantity[0].quantity);
            }
        })
    },
    getLatest: (userId) => {
        return new Promise(async (resolve, reject) => {
            let products = await
                db.get().collection(collection.USER_COLLECTION).find().sort({ $natural: -1 }).limit(1).toArray()
            //console.log(products);
        })
    },
    cancelOrder: (orderId) => {
        return new Promise(async (resolve, reject) => {
            console.log(orderId.orderId);
            let order = await db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: ObjectId(orderId.orderId) })
            db.get().collection(collection.CANCELED_ORDERS).insertOne(order).then((response) => {
                db.get().collection(collection.ORDER_COLLECTION).deleteOne({ _id: ObjectId(orderId.orderId) })
                console.log(response.insertedId);
                resolve(response.insertedId)
            })
        })
    },
    changeOrderHelper: (orderId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).updateOne({ _id: ObjectId(orderId) }, {
                $set: {
                    helper: true
                },
            }).then(() => {
                resolve()
            })
        })
    }
}

















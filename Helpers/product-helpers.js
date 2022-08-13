var db = require('../config/connection')
var collection = require('../config/collections')
var ObjectId = require('mongodb').ObjectId
module.exports = {

    addProduct: (product, callback) => {
        db.get().collection('product').insertOne(product).then((data) => {
            callback(data.insertedId)
        })
    },
    getAllProducts: () => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray().
                then((products) => {
                    resolve(products)
                })

        })
    },
    deleteProduct: (productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({ _id: ObjectId(productId) }).then((response) => {
                resolve(response)
            })
        })
    },
    getOneProduct: (productId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: ObjectId(productId) }).then((response) => {
                resolve(response)
            })
        })
    },
    updateProduct: (productId, product) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).updateOne({ _id: ObjectId(productId) }, {
                $set: {
                    Name: product.Name,
                    Description: product.Description,
                    Price: product.Price,
                    Category: product.Category

                }

            }).then((response) => {
                resolve()
            })
        })

    },


}

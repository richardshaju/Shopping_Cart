function changeQuantity(cartId, productId,userId, count) {
    let quantity = parseInt(document.getElementById(productId).innerHTML)
    count = parseInt(count)
    $.ajax({
      url: '/change-product-quantity',
      data: {
        cart: cartId,
        product: productId,
        count: count,
        quantity: quantity,
        userId:userId
      },
      method: 'post',
      success: (response) => {
        if (response.removeProduct) {
          alert("Product Removed")
          location.reload()
        }else{
          document.getElementById(productId).innerHTML = quantity+count
          document.getElementById('total').innerHTML = response.total
        }
      }
    })
  }
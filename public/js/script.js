//--------------- Product --------------//
console.log(window.innerWidth);
document.addEventListener('DOMContentLoaded', () => {
    const wishlistIcons = document.querySelectorAll('.wishlist-icon');
    console.log('Found wishlist icons:', wishlistIcons.length);
  
    wishlistIcons.forEach(icon => {
      icon.addEventListener('click', () => {
        const productId = icon.dataset.id;
        console.log('Toggling wishlist for product ID:', productId);

        const heartIcon = icon.querySelector('i');
        if (heartIcon.classList.contains('far')) {
          heartIcon.classList.remove('far');
          heartIcon.classList.add('fas');
          heartIcon.style.color = 'red';
        } else {
          heartIcon.classList.remove('fas');
          heartIcon.classList.add('far');
          heartIcon.style.color = 'grey';
        }
  
        fetch('/toggle-wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        })
          .then(response => response.json())
          .then(data => {
            console.log(data.message);
          })
          .catch(err => console.error('Error toggling wishlist:', err));
      });
    });
});
document.querySelectorAll('.wishlist-icon').forEach(icon => {
    icon.addEventListener('click', event => {
        const productId = event.target.dataset.productId; // Assuming a `data-product-id` attribute
    
        fetch('/toggle-wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ productId })
        })
          .then(response => response.json())
          .then(data => {
            console.log(data.message); // Log the server response
            // Optionally update the UI based on `data.added`
          })
          .catch(error => console.error('Error:', error));
    });
});

//------------------  Product Details  -------------------//
//product-specification
function p_d_s_button() {
  document.getElementById("p_s_Dropdown").classList.toggle("show");
  document.getElementById("specification-arrow-icon").classList.toggle("rotate-180");
}
window.onclick = function(event) {
  if (!event.target.matches('.s_dropbtn')) {
    var dropdowns = document.getElementsByClassName("p_s_dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
          openDropdown.classList.remove('show');
          document.getElementById("specification-arrow-icon").classList.remove("rotate-180");
      }
    }
  }
}
//product-description
function p_s_d_button() {
  document.getElementById("p_d_Dropdown").classList.toggle("display");
  document.getElementById("description-arrow-icon").classList.toggle("rotate-180");
}
window.onclick = function(event) {
  if (!event.target.matches('.d_dropbtn')) {
    var dropdowns = document.getElementsByClassName("p_d_dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('display')) {
          openDropdown.classList.remove('display');
          document.getElementById("description-arrow-icon").classList.remove("rotate-180");
      }
    }
  }
}

//---------------------------- Wishlist -----------------------------//
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.wishlist-icon').forEach(icon => {
      icon.addEventListener('click', async (e) => {
          const wishlistIcon = e.currentTarget;
          const productId = wishlistIcon.getAttribute('data-id');
          const isInWishlist = wishlistIcon.getAttribute('data-is-in-wishlist') === 'true';
          try {
              const response = await fetch('/toggle-wishlist', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ productId, isInWishlist }),
              });
              const result = await response.json();
              if (response.ok) {
                  // Toggle wishlist status
                  wishlistIcon.setAttribute('data-is-in-wishlist', !isInWishlist);
                  const heartIcon = wishlistIcon.querySelector('i');
                  heartIcon.classList.toggle('fas', !isInWishlist);
                  heartIcon.classList.toggle('red-heart', !isInWishlist);
                  heartIcon.classList.toggle('far', isInWishlist);
                  heartIcon.classList.toggle('grey-heart', isInWishlist);
                  alert(result.message);
              } else {
                  console.error(result.error);
                  alert('Product added to wishlist');
              }
          } catch (error) {
              console.error('Error toggling wishlist:', error);
              alert('An error occurred. Please try again.');
          }
      });
  });
});

//------------------- menu --------------------//
function nav_res() {
  document.getElementById("mySidepanel").classList.toggle("visible");
}
window.onclick = function(event) {
  if (!event.target.matches('.openbtn')) {
    var dropdowns = document.getElementsByClassName("nav");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('visible')) {
        openDropdown.classList.remove('visible');
      }
    }
  }
}

//--------------------- footer ----------------------//
function c_h_button() {
  document.getElementById("collections-dropdown").classList.toggle("collection");
  document.getElementById("arrow-icon").classList.toggle("rotate-180");
}

window.onclick = function(event) {
  if (!event.target.closest('.c_h_button')) {
      var dropdowns = document.getElementsByClassName("collections-dropdown-content");
      for (var i = 0; i < dropdowns.length; i++) {
          var openDropdown = dropdowns[i];
          if (openDropdown.classList.contains('collection')) {
              openDropdown.classList.remove('collection');
              document.getElementById("arrow-icon").classList.remove("rotate-180");
          }
      }
  }
};

function c_s_h_button() {
  document.getElementById("c-s-dropdown").classList.toggle("service");
  document.getElementById("c-arrow-icon").classList.toggle("rotate-180");
}
window.onclick = function(event) {
  if (!event.target.matches('.c_s_h_button')) {
    var dropdowns = document.getElementsByClassName("c-s-dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('service')) {
          openDropdown.classList.remove('service');
          document.getElementById("c-arrow-icon").classList.remove("rotate-180");
      }
    }
  }
}
function f_about_button() {
  let dropdown = document.getElementById("f-about-dropdown");
  let arrow = document.getElementById("b-arrow-icon");
  let isOpen = dropdown.classList.toggle("about_dropdown");
  arrow.classList.toggle("rotate-180", isOpen);
}

window.onclick = function(event) {
  if (!event.target.closest(".f_about_button") && !event.target.closest("#f-about-dropdown")) {
      let dropdown = document.getElementById("f-about-dropdown");
      let arrow = document.getElementById("b-arrow-icon");

      if (dropdown.classList.contains("about_dropdown")) {
          dropdown.classList.remove("about_dropdown");
          arrow.classList.remove("rotate-180");
      }
  }
};

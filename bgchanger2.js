var bgSwitcher = document.createElement('button');
// Here You can type your custom JavaScript...var bgSwitcher = document.createElement('button');
bgSwitcher.id = 'bg-switcher';

// Style the button to be a blue circle
bgSwitcher.style.position = 'fixed';
bgSwitcher.style.bottom = '10px'; // Position it 10px above the bottom of the page
bgSwitcher.style.left = '10px';   // Position it 10px from the left of the page
bgSwitcher.style.width = '30px';  // Width of the circle
bgSwitcher.style.height = '30px'; // Height of the circle
bgSwitcher.style.backgroundColor = '#FF80e6'; // Blue color
bgSwitcher.style.borderRadius = '50%'; // Make it a circle
bgSwitcher.style.opacity = '1'; // Make it slightly transparent
bgSwitcher.style.border = 'none'; // No border
bgSwitcher.style.cursor = 'pointer'; // Cursor indicates it's clickable
bgSwitcher.style.zIndex = '1000'; // Ensure it is above other elements

// Append the button to the body
document.body.appendChild(bgSwitcher);
var index = 0;

var backgrounds = [
    {
      url: "url('https://i.imgur.com/HW5oGSu.png')",
      position: '83% center',
      size: '55%',
  },
    {
        url: "url('https://lh3.googleusercontent.com/fife/ALs6j_FrnZns_OIXjdlHOc6AGzHJ3g7B_pruOZ0XAusHFs5ZrH8qdP61VS3fDydpek7SFWCdXh_E2SEDmSqsgqkvc_mZZtPC7_q3Y52XH-iHndgmEnysElN4CGfkTSvHWPEopCzdjtQbkGsR7ztwKCO8QWcTaCbxCtpcQ_MwJhC5SKk_AmzBMs6yFy01C7H5TYfPVt-JyfLKP-4lwgRZhomLCEL3iFWPZXxMiIawJfYOfu_azjtGUbvbpViF8rFWUYHvMBJAJU_b8xdAvBD0cXXtTgKefhRXX1nkuh9vwarDBxLu5zfNYMuT77-kBLAizklT0yYKv-_hYLdxViB9iM6QoJW8hZ2UoLLbtS_VkAapwiOSXdnJGCpaVgSolUvansTGkG92Lhyte8GbiI5aoxlU_Af3BQmRsx6dhBgUrNiM8Ey4meG3IaOPNTMd0J8Ot3EVshaXZ_YNJJRvxHfE8let93FaI_jyiUzWLgdHEYQYashvFyH2XMuDtLObxaQKB_yB3TBTCfrtn3OlWq2aMs4cFd8KyVjRMxirGa8tvmxDPgYN_sq8FI7W7hTnFyW921IJfxhbzPk5jXEMdHyfZu-Q2MEPSMAv_1eJw4jNifJGh-4los7xjGC9GzzHj3z4dCSsbosQ6bIg19ehSv36dTReQWiks368hXWAXwa1Bqkli6BIObp-yXp8xGtAMskxdKarzC9544iZdz6oCk_crm-AUZvE7hnGZKjJ11xUG2vJf6zO-G7fCMzQRTNBCIvsQ-ltxZ6YWfwVdnCIP8kF42EuyocVFnIxJe1E-MeRh7dBKdqC32hPn6uxaJB7tpHi0miI8E4_uWSiz1QbudxbV78lxUzFmCH0D6ampcc04MKjoKbraJjv3r_a-ecVrcud4FJMZXoJNbxYxY6Y8w_2Fnq0gLTaQQP-j5WP7KrGUFPh3KEFHivK7qknoeT6L3nNNpw8KhIUDGqzUVvqfvP6JwQpcdvE_vyx7fSL6KEJYj_t6zlDdgC6X-pGa0g-HOLXVgcEiDjK9rKn2yLBAJBhX67Fn_UcdGN-YWNjG8G7TcKFVhbCl6VnovkoAfU2RjWhUtNNuDEL0GfKkIycMOeftYC-1DUQKaw9uumY-MaLr5pdUSg_4bnvfR3BtyawKbXvT1LTjjPrhLtl4cpNMixU6VzeWu89wTGvbGqKFqQtHP67XZYp9hcjRit-8r_KP1FnmWuZI_wFb5KIUi5pVOjCN_R6GwjjDAcxBxqKlnTsiOsi0xrZjHV894KlwapQMPXh18m0K__UG_K1a5AYD46CJaM9JEUIUhKP9yxeequNK-yxgG3vf0yfIo9rYtWFrxadZ_wt9iI0kXJiC3JIp6eWG3UkPP0LADZoos6RaCZdclmMga7x4s8FnL2o0_o3rk10R6xgkbuCCbz_Wai6iwHE4DsA74ms_Xep_L033C5P2PG6Cd6jzixXcAu9GrhIp9nzqgNNlvMdm3KUbI6h0fV8y0HhD3H_Vbt-dJzAymhxh_QGT6gL1xpUP8bf9b65uU06dbvG2QT0Y6ghEG7CsGoIU5ulNlC_he9pxbakwXkEFVZolKEY1ADlEyA6n8S-_bu3EIf0rt0YPd3uw_jMjgifhF9WGFc_mgRZ3wNXZNsqhjB-UB25GSnwUbjpv1IHeRK6wBHSedXSok7CPucCHSSgkC84niwxcYTFgO6OmKjMldBoLMYqZCzedK5aNZ3OpTVrzLBIof2a8gYDF6SMAqn8EXKBMHvz1Ycc8buH_A5wNID8aEJjeM8TRZtqGOnL4TeZjuU6JPdPpEzBVfZBFXRbL-c6Em7Xr2Z2nFpgK0KwyWVwwA7FMOzzXwcGnoTwXB13N2Y4tPU_9Tn9OBQVa7IkAZZFlaewaLfgnaW3WKDmxDYWy05YIk3NAqrS32za9I-tCsGbUXFhxpRrcttiFyGo=w2324-h1852')",
        position: '50% center',
        size: '100%',
    },
];


// // Add event listener for switching backgrounds
bgSwitcher.addEventListener('click', function() {
    index = (index + 1) % backgrounds.length;
    var currentBackground = backgrounds[index];
    document.documentElement.style.backgroundImage = currentBackground.url;
    document.documentElement.style.backgroundPosition = currentBackground.position;
    document.documentElement.style.backgroundSize = currentBackground.size;
});

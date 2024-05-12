var img = document.querySelector('.killer-call-img'); // Select the image
if (img) {
    img.src = "https://lh3.googleusercontent.com/fife/ALs6j_EKgaGAET60lFZZsRHW6aYHhs14AEHI6ynqtLWm-N5nGcKajtinw4hYves49P2DpzwvWWdFKK8W0BYFweYba5elDQhPvwaw1mSIa-nLid7mlnA-iD7Kx7r1uF4B0BN7O4JQApDfazFVih8Q8Q3P-tyJPuISGBJon-3DsRHNK28_5SKAuFXh2VaDOQuu5rzllmdJsGOOs3744nc5DXIQjk0_Jd30-YGC71ro__0oMUn2k1QDsr-Kf_DujqqskmTkSjtRzvwQ4CK2BSlQQFUKSY1d2VxN_9BrwJIPekOh9uCtIiBP2PA5ap6pjZWa6w2oK07UyVr87MOe6BdlvoJJJik_YpPvuEB4K-ePi_OcGQ6igzuFwdmg4FgsjG0l3UsHxkNMVfI3Qls2_EKFcVlL-LcFrUfRxApsbkGP-4GTBuTeIZNiXQFYpkWL5JMWUb4yXhePLkGpcVb7aLoWYMRqk_3yPdHwbVv4EibJtNNWUUuZWQ5JpXyCd6_MwR0bRT1vUvEd0S7t-yvKcc_bpUbg8LLp9qD5Uth2CIbOmSNnvpwXG8rqlaaDnFkJzPdPe9MXi7X43zfGncH84O5DI-k0iLf1ztO5bntBmzddoF2sTzOq5Xuinm5SrEYifkS-EwXULm2M-9UZE8Y7yRmpU7kECHfHZaKqzLiUuqf2MpovmTZk8Fz7D7bnNztdbd9lMjmv8OPzZeWEVyKaprfJwujvwR0xyOK3jpL2NG5hKAua0gzWg7Rp-kdxXRJDBV_u4bhlhE9tcpidF-Fpkg1SHu26nwKJOx4D6Z2hBcmUl7lJj0_Ue7qUNY6pFXfZXZnfGV14QodWJ8kSgm4em1FHp9cGMH50qN54gdCh7YNhcq5S0EG0ksntqso15m44ZwzjIkVdIMtAl9iDZExKUJ9u7SAsrvDr6miR_ED3FD3Po2-cD4dGas5e1j8xk5Vvrf5sUKxHIe3ep5rhuleuHjDDaxCYZ0Gr2ppDaaazN5TFq9Qy93xS3tTZUhLeiOClT05KYACHGc-7BENRL8OyYSyw6MnWTMVwfZ7DOAXYrPSRyF3XG6WCxCpC0rWC0bcijdEqAJP3JkA01dGwZ98amIm41cfWery_cQxmyeJ_BvPU27Q9IVkHelk5erMKWIvhpF4QU-oUGayLczZyEUebT3jutpSoT18YK3rS-McF8jxnauGQ3Eyx33n29e-0BOjiJZfw7X8JN5ERfwmuzIAl_rEjn333pfEmiLXr43Nj-MEVnaOBmHBdgGy8k6p05rbmB6NoRTNNzsGswu4BD81CUrQAoUl6cnRsSRSefdTIZBVt7B2EDMeHJ6BtBvFy5GL0GXA22AP5q22hOj6Y3NK-lCTIXeozv_nw-OhluRUbDMqPDD2Lv6G4gQPg75ILxffOJ9th0EuztLZNs-k9G5nrf2SXvNGOnxEbiUGs3HOg_Fz0MHWE0H7QJClbS8nngDBKC9yEQ_TXpKb7RfcG7WyzfsjZSdwxT7zHl3yUC2CUyMmGjoTlW6z3mTdqp51-a8YpNzK-hA7qXExttCkPVZKkzRa9KmR6jWl-gkGZEwZnaiiiFH-mVg6uZqsuiIjfqSy6U4pxgEOfvWnADNrrxOiXuQoFXlUvGMEqxVyZs0VIflBHLRwsuCUzo8YaCNPgUthh9eYtNhe7dxtXU__elIKp_eI9mlL6G_B48IAFyZPHw6DA1itCfW09FXqsrL8TvHVVKpIjiWTPBAV1OAP-LqA7PThtKzc28Nf51uyMtbV4KciwUusoSmNFlK8KygM81x5iKUrh3Jfhnc5s74cEFiwogyT7Xj0Qatc7fDg19fBs-BcV33-brxiD3nKachQfYWt_XyBXobWM3L6PPIqR3nOw8lpLtiwhpZd9mzpZqzQAlgxXttSs_YCQb1Xdpxl4K3K4dlUKgxmMmOmE8r32QCZXmPyGBA=w3456-h1852"; // Set the initial source
    img.style.width = '63.5%'; // Set the width
    img.style.height = 'auto'; // Maintain aspect ratio
    img.style.marginLeft = '0px'; // Initial margin from the left
    img.style.marginTop = '0px'; // Initial margin from the top
    console.error('image loaded');
} else {
  console.error('Failed to load image');
}

var bgSwitcher = document.createElement('button');
// Here You can type your custom JavaScript...var bgSwitcher = document.createElement('button');
bgSwitcher.id = 'bg-switcher';

// Style the button to be a blue circle
bgSwitcher.style.position = 'fixed';
bgSwitcher.style.bottom = '10px'; // Position it 10px above the bottom of the page
bgSwitcher.style.left = '10px';   // Position it 10px from the left of the page
bgSwitcher.style.width = '30px';  // Width of the circle
bgSwitcher.style.height = '30px'; // Height of the circle
bgSwitcher.style.backgroundColor = '#80FFe6'; // Blue color
bgSwitcher.style.borderRadius = '50%'; // Make it a circle
bgSwitcher.style.opacity = '1'; // Make it slightly transparent
bgSwitcher.style.border = 'none'; // No border
bgSwitcher.style.cursor = 'pointer'; // Cursor indicates it's clickable
bgSwitcher.style.zIndex = '1000'; // Ensure it is above other elements

// Append the button to the body
document.body.appendChild(bgSwitcher);
var index = 0;

var images = [
    {
        url: "https://lh3.googleusercontent.com/fife/ALs6j_EKgaGAET60lFZZsRHW6aYHhs14AEHI6ynqtLWm-N5nGcKajtinw4hYves49P2DpzwvWWdFKK8W0BYFweYba5elDQhPvwaw1mSIa-nLid7mlnA-iD7Kx7r1uF4B0BN7O4JQApDfazFVih8Q8Q3P-tyJPuISGBJon-3DsRHNK28_5SKAuFXh2VaDOQuu5rzllmdJsGOOs3744nc5DXIQjk0_Jd30-YGC71ro__0oMUn2k1QDsr-Kf_DujqqskmTkSjtRzvwQ4CK2BSlQQFUKSY1d2VxN_9BrwJIPekOh9uCtIiBP2PA5ap6pjZWa6w2oK07UyVr87MOe6BdlvoJJJik_YpPvuEB4K-ePi_OcGQ6igzuFwdmg4FgsjG0l3UsHxkNMVfI3Qls2_EKFcVlL-LcFrUfRxApsbkGP-4GTBuTeIZNiXQFYpkWL5JMWUb4yXhePLkGpcVb7aLoWYMRqk_3yPdHwbVv4EibJtNNWUUuZWQ5JpXyCd6_MwR0bRT1vUvEd0S7t-yvKcc_bpUbg8LLp9qD5Uth2CIbOmSNnvpwXG8rqlaaDnFkJzPdPe9MXi7X43zfGncH84O5DI-k0iLf1ztO5bntBmzddoF2sTzOq5Xuinm5SrEYifkS-EwXULm2M-9UZE8Y7yRmpU7kECHfHZaKqzLiUuqf2MpovmTZk8Fz7D7bnNztdbd9lMjmv8OPzZeWEVyKaprfJwujvwR0xyOK3jpL2NG5hKAua0gzWg7Rp-kdxXRJDBV_u4bhlhE9tcpidF-Fpkg1SHu26nwKJOx4D6Z2hBcmUl7lJj0_Ue7qUNY6pFXfZXZnfGV14QodWJ8kSgm4em1FHp9cGMH50qN54gdCh7YNhcq5S0EG0ksntqso15m44ZwzjIkVdIMtAl9iDZExKUJ9u7SAsrvDr6miR_ED3FD3Po2-cD4dGas5e1j8xk5Vvrf5sUKxHIe3ep5rhuleuHjDDaxCYZ0Gr2ppDaaazN5TFq9Qy93xS3tTZUhLeiOClT05KYACHGc-7BENRL8OyYSyw6MnWTMVwfZ7DOAXYrPSRyF3XG6WCxCpC0rWC0bcijdEqAJP3JkA01dGwZ98amIm41cfWery_cQxmyeJ_BvPU27Q9IVkHelk5erMKWIvhpF4QU-oUGayLczZyEUebT3jutpSoT18YK3rS-McF8jxnauGQ3Eyx33n29e-0BOjiJZfw7X8JN5ERfwmuzIAl_rEjn333pfEmiLXr43Nj-MEVnaOBmHBdgGy8k6p05rbmB6NoRTNNzsGswu4BD81CUrQAoUl6cnRsSRSefdTIZBVt7B2EDMeHJ6BtBvFy5GL0GXA22AP5q22hOj6Y3NK-lCTIXeozv_nw-OhluRUbDMqPDD2Lv6G4gQPg75ILxffOJ9th0EuztLZNs-k9G5nrf2SXvNGOnxEbiUGs3HOg_Fz0MHWE0H7QJClbS8nngDBKC9yEQ_TXpKb7RfcG7WyzfsjZSdwxT7zHl3yUC2CUyMmGjoTlW6z3mTdqp51-a8YpNzK-hA7qXExttCkPVZKkzRa9KmR6jWl-gkGZEwZnaiiiFH-mVg6uZqsuiIjfqSy6U4pxgEOfvWnADNrrxOiXuQoFXlUvGMEqxVyZs0VIflBHLRwsuCUzo8YaCNPgUthh9eYtNhe7dxtXU__elIKp_eI9mlL6G_B48IAFyZPHw6DA1itCfW09FXqsrL8TvHVVKpIjiWTPBAV1OAP-LqA7PThtKzc28Nf51uyMtbV4KciwUusoSmNFlK8KygM81x5iKUrh3Jfhnc5s74cEFiwogyT7Xj0Qatc7fDg19fBs-BcV33-brxiD3nKachQfYWt_XyBXobWM3L6PPIqR3nOw8lpLtiwhpZd9mzpZqzQAlgxXttSs_YCQb1Xdpxl4K3K4dlUKgxmMmOmE8r32QCZXmPyGBA=w3456-h1852",
        position: '120% 30%',
        size: '63.5%',
        marginLeft: '0px', // Horizontal margin
        marginTop: '0px'  // Vertical margin
    },
    {
      url: "https://i.imgur.com/HW5oGSu.png",
      position: '83% center',
      size: '95%',
      marginLeft: '0px', // Horizontal margin
      marginTop: '0px'  // Vertical margin
  }
  ]
  
    
      // Add event listener for switching images
bgSwitcher.addEventListener('click', function() {
    index = (index + 1) % images.length;
    var img = document.querySelector('.killer-call-img'); // Select the image
    img.src = images[index].url;
    img.style.width = images[index].size; // Set the width as per size attribute
    img.style.height = 'auto'; // Keep height proportional
    img.style.objectPosition = images[index].position; // Set the position of the image
    img.style.marginLeft = images[index].marginLeft; // Set horizontal margin
    img.style.marginTop = images[index].marginTop; // Set vertical margin
});

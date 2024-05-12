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
  },
        {
      url: "https://lh3.googleusercontent.com/fife/ALs6j_HBCvp6y-adjsc95nU7nuBO6HRooASMkFz5Y9KUh_FBBBH22Cq--OCFPlJnc-ACMyqJhl7A3qkPoJMg7_NMVbtDTv2v9jbwXuK7maS5ZnZUv5VFUCWshiSKCrvaQrOWbRIWfpOa4Tg8N4pVIiAkgRh3UqLnYoSoGdQlTBMcLXXnFJOHbCsii-dgkHCMZWE13usHxQfHVlML4_oVhdq5LGQhUdCnaoDfwB1ICrYAc9z8dHrLGaKX3ZbCOCCW6SJuI0C-jy7NkC5tRs9L_V4QLNy0cUALU-lGZUNl82GutHaOpzNQAWq-yeNb45eA2kE6DBGrfnPM-FluFKdCpmVAGUMsMGufBxF0Zpx3DEwEKxh16VAPcrXtIqe8xlTFd8OGqoTmNkcCJ2v3l47iS4d4vWsyBHtodRXB4GMNyFrgRblMkct-vAohZLQs60IkrYvh_GimEtp_oANQ6MgW5EmDgcMX2HUnqdDYmJYeT1ZNxM-I1cCTdg2kXfzuIErOleVS_Hm0j-n9EcnVsXXh6NzHKkk2lsJ0Q28AHQ_wFozGlNCOlWY6zN0vdIbh9ooWzMAbI_IlTYIgrR4PSZpHljti4TcSL9P2hp1hJ_YLc0O5DcDRAB16c_J09XolLlnY2-JSaBJEBr4DCE92dZAMke_WjsN20lzGV0rZi5QFsZb90v1Mui2VweSdNAUsH6QXiUhkf92hLxjBXcCVJBrUXIeq7s6KCCvg1IfgDVfqpesYcdmXAAf2MgPl-1Byc4pj2HSylNm-uVlnmAH246VVpHhLktYMpp6bl7Z_B7Uf0AohzzgaUkmMkhInM2r6RC0_y7mfZGPv6lzmRxqqt5-aMul6ibDhbbk4Wb9LnowhHxmZ80w0d7abzpMd4q0PltGUAZGzeit1i1NtZThxKnxrAdoI8XrXkYC8ZEsZPMgAINoJ5o2FsM1K6nYVn-hr397WHMnDi8x-on_8u_PjIjk7R5wcjeTBT49fv-MUDlYgnW9GaqCMM5HOBAzw1uxsgzbitQYyxsHPHbFppk2pzURoPTAAyJkWJSV1d47vZZw0Eup9HeJaTfq_npXF28cISVp6ub9IkVkx0L92kVgNOzZkugSqr6ZGWh0czEvKYfTGWdzelRGMcc-l1ST2Uc0VanZvN_u4PS2M5EhcBAvLdj-L36zNpyI0YlsZ9vw0JfS4dMbqr-wawksqi7uWfJiQXmJ2deKtiiHf-BQdtlaUPRxtxZDZeHTwL45_BFHSA5ub9XhgK-5wp7WA5YHZg4ixqUUOQRw43V8o0Px1RJhAlrP3rE-zXJsSXKJFN1cCwrJ1Lzb58d5-K-TVUs8Fc1Ej8_4xCFd8R0SVW-WteIME-LiaohuVUWWAzp4ZDitvVQnikAgA-Gy0g7WzygfHxneGDLLcZHAStpqGxDA3_8wRKNI5ySjr-ZSs6U17Z9ae0-INzJhhFYfT67EOJyOr13pK057LI9TJzTDO3SastllPDA-lvJEsCYpzVMooFtiWr-4d0YP1Xxol1fGWgsbdTMwBtUjNF2cWObq3ABX3cwInzB6NFQlHdfWczYLQlW3ukFSuwniV54rDx8DUNyNIz0sO_PZijLFW1-KR7mWhF-qG3fUVzmS_GXG0F3NOIXxhZD06puNFSDv_3ZgCyhfUGT2gN3WhV5YOLdFSJf-wea-nyGIFgWm9-MCdbTQ_dMrgl8UECQ11oxFEB_29bY1m38lJrVsBTGPNPzHraBm-jTCxLZh948nDXLb7TdQFe1BpJ0JtiPMYGukjzMimXdQwhnYcuHgyNwgvI85uxxVps4fBkl8qJsXo5_DpkkpyEy1X5JSv_o6PB98kUr47Jq-ae3DD_jiXbZWXKPbTRMUjQrvHBvLYkJtxhQ-epeDmkyE5UBs7xK1jRPWgLXPSH03xH8ku1VeGoUYUxLhVJwgawXKV-_dK=w2172-h1852",
      position: '83% center',
      size: '95%',
      marginLeft: '0px', // Horizontal margin
      marginTop: '0px'  // Vertical margin
  },
        {
      url: "https://lh3.googleusercontent.com/fife/ALs6j_Hs1d4l26qS0KOOu4XBR4MPdDZ-rqB6B7NmOaDIe6nq3bbKD2-XIWFbc7LCCbOp1Uz9nkxYkQE7elXXMmhzHmq7UYFydU9qa1BkWhP4XbuNfhK8ed3rh0vnyAFikFXaIaF2uQPdr315AFiOEZgEHuZKT7tPClw4qt6XZrIpfnGKVLeKQwTTyq46rrESUSprUDIjSeo1JBjd29CUCn2AVYpYo2a5lm3DmArcl3ypaKB6Ynqm8yLwBJ1_XZvDucXPOObjGOkHLOul3mx2BswJUnnjt3g7g9aw2BGZ8ggEQF8YlyBJhBYWNy3OAC86mL_Wr16c5ijyLklCWKo1rmNTJXZAeEs5sppBtMUg8WWmB0SWPmuldXKNFVoiG3bs_DuaRQ1fQWPGfklVmunN9vqbqO8_TgqrF9thSJ1W6jaVLvGz62eNLb5rM0w936zZpHcMIHkGRL55KQtXSPlHm6KQJo6Uf_41Om6sqze9gqQc4fGugiE_8Jz4EEM9vfLAQU39aaPhAYzA70FmvXdmxQ8m4BUCz2dIKKSkX4k9BPAWdCyt-aID1TUzdY_84Rck_PFw2BdbtZ5f1rf8IiXGKE378Wn5K-3hzP_HaYYuErSmQqKYzeOkeo8tUGus9kzZO4o2qd_UctdhtXCjAB1mfc5jSajCITn3jQA1PTVYlTJXcy9NkMWvVYu5dTcwH0Z5V4-9PFVwieyYITgkC4Zn-d9CJA-8hZtd8kykUlF5zhZ1dOAfnG0RTrDeoFXm-SSYRlnjLQ_0tfZ3F5-9LtZvHiFHRvL9dEUfJ960oadLTx8oi5UbsILC_TlDcglr-S2c10zF11eU_36idEJ4RaMVfDSHu0FpWikovrMiUfWsQOdJxvusIIhVgrCVS4L1EaEOXts4JKt7tNOIv1EqL6-eLwfnpWgBO_vhmpN5jT7ElCB3pJFzgD6_7MZsmnncrwi7KWP4hCeLv0ahm8ceF6vExmZqiKDr9J_P5ytfn-jktsZpgFOKpl59_W19Dr5Oegq-y1pWGLUqCYhxs5mZPdT1i3sl1oGf422AtIloJ28ml-DFDL0pjfq11BaXwTZuqk8tzFiWT4063kGRCNVqnwhjzXZZrx1IsuGRA84NAK4JRbXolBLBYfEPhemaZN-XsFu4tkQC24f106_vjBoUcrf8kCgYqqe9DTtaKLCLNmxcMvMjb8cRBUDV9AMi77LrqkTXVZhhCP9qN_lUcJjx1yNtrDwsB2SKN4kk8WrWRR599xmAQI4FyIxX9VkRHK6lhP-jgf6Zi2j_Y-8MzXckqmTubs0kYZ2akPmdbWJcKmio8tCZIKf0Tmr59pezbCHKsnKWq6VOvKfkKdsDljzug9Os-4TFsIysXkwIQWupAyuCmErN1QVfEBYRls19R-J1XaktTTBkxDwopTtjObVsfezUsNZEfY340U4XdqNyfaC2UWVmAOFCMEe4fVldMK2s05yxEtxOrY_nieWDy5wbA9ovYqvMWSq9nF4pleiMJxvOYJOTWFf9rxfWTVtGWDYwgIj04ytFSJuHL8mjb0OfVsABDALG4SjVCFECMYqcvQ53RsFIqwZB-PV8_PcaFNr8m7DWZZ2ZI8i8I7vJa_qXjZzSTlarBuEZcVkaGswIIG_QkRdcexo3ICKSlkkpWvZ6LXaIWGpIq4ShXh6qFQGl741bmfKp0PZMRBhdFDJRjcoigxjx4hJsUy5Kq5jr_QXaYMRO4vdyMd_XzDnOmVeooDgRw7OA_YErcNqMx6JqEgJzggAQiDQrYgM8kpyKlP6qKQ-IpefzPDI4UR8SlzddLvcTF1DV09DV-yc6eDlGiF803T28uggeWFJNKVWPN3IOMa_Yz-9PwZqvhJYUifqgSGlHvBjTm4w8wQe1wdpzcqmNjivGbg43p2v_IZ-CyNAt6_hooLY80eL-axHERuZwMatyfQ=w2172-h1852",
      position: '83% center',
      size: '95%',
      marginLeft: '0px', // Horizontal margin
      marginTop: '0px'  // Vertical margin
  },
        {
      url: "https://lh3.googleusercontent.com/fife/ALs6j_EeL_0f_agZv8Wi4N4sh_XtuFUCys4Y8Jog1G-mJbvBKQkohtsqJ0gcv5XdSykk5haAnLvvXcJwovhacvj-ygMdoD2flj7ih7a2MqteHEX8ozljp1YQXyIhztSswkgM6MZlGp_Cr9o93aXdsZ6ldAUdyWDQ6XsccWPUm8dWSCqPmEN0lQ9PJLNjcXhllLdxd7BL9jLB5kb9t9q7GhrnPIyQDTXaCwMISZrXmal7H56e8xrxh_HEyJnfIIylA7jeiLv8_rcM4EhCOFDddx1dBcWWcsF8MWnJN-lPf5oq036xZMdBW539w5E4fwUO-A0PIwppUlmH-zMUTBplDGSOC5tl13gsgHwzdN8wZD9qH4ojBVBxkMzq1mFFflVwqAcVtUmxc-qxPH1xzr6AhcVHbb04FQpzHlQ2K2Vi7-wJqIYoKKvkIIBH5CUdodRRKQYr_nieZ9owi0yVSBK8xl3KfLNIt84BdkD4QQo5gCedEnitrNfzq2xPLsIIQ6qRk8_23C8z4wRBRoLhubv7kNYKJ38zcqn2sr0tVQDub9u8OFJuKLIwv50-_4jNewBzKnHuTH6RUfvdWDWA4If-8tPV5gyRKmDRVOqBTCdsYzDG_HceJU0aEyox4FpdXRT3cQg2PlvUDCP-0Tv3QTSnIqzpfiyxL7a6pNoyNUE7hOcDsGwtJ_lUrWDJbC2IOfJGltSxY9J5Gv5nLe9oEh1r9g_PXA9jHj1yrytv8ieSLZqT1eoqOroa9b3E9NqJe7FFuhAtKogRHUX4uDXWeT6UKuY_PW1kztmUvskdcWOwENYVMDMrqM8PoFWxH0-bb4f8rmOeXdYLT5QYtGbzEX5P198194yf5cFjO7MuwHQTaCoaesoa2zapEHo6MuS_vrY5IBheal-i79XgxF2m6DYqQzPFW3lmZcA9gNlvDCWJ2tHQdxcqFhwAo1CLI8c6rPpO2-5H2qSbuRO5OzolqjCJ4EsbSlnEAY_op8nozv1dxeD3tcgUphvu1VNIf76gc9bMpLtzLlN-NAim2RvUqUewa5Gt5Oou8s-ctHomxsPCl-KQEg-NQ-eigfPPXjcsGT_R6wqSk-WUm9D730674pgz9Q8N5en5PRAkwvZP79H_PNKlsxJwuhn2635YJv8MD5pY7rQi421-cXIMgj0of56ZCWXDzcfsPCsKVGcYlcofJGrYGp6pu35BBFe5fIKnQputgxGJjBUkwUHffo7I5sRYzwNM8l8sb54xPWcdR8ZzAAjygn190fCxSgBQpMJBzeol51TfsKEUdzavdEMRDTXLdXKn6y4mtuzFJkIYxowFjETb4foyu1iQfUDBM6vJACRpTICTJx81k5AO6pr5mwW2KtXGAKCceRIMohR9fNzHBtJgqaei-Qmcij47O3tKjl0MBn_BQ3dVvVz2MCHQDkOg-MXUq6tqqeXTEuE9-whj2OCxV6Fhv9G01fCw9jAOH5dQKXTxo_R5AFvSBBVlokKM5c-L3qV9EJmhFjQHTbUBZ2RkZyUPvgTtjJM8dFq3kgrRE6jUajuz3FYIktxuULAnj1Hz92Sf8gtRZ3AlELHIGOTORgNarn8l_8fu6jDi5dXYPmQYC1P1NXWOWaZv4ZFyAlyaiGNkoZsTPoAuBCMIj5DsWpjtxBLLawrke8_GlQw8JGzPx65_AncpO93g8vWJsPUupeZTB9EOg_eqww7xHv-fElaV295To6bSGECjhd5Ov_79N6t3M-eZSwnOxkZu3hnk5BBj1t0JIhiBBiCHQmU637g3BaASgKBQIktawHr-9Cy4Y7bWkfoPZJaqoQUc0NsMZG3I9vo0JmBJDAhwGr3sbeGtbjAU9xFin9FzPXBnmQF1SKg-Hrs0eHyYEMxHw1fE4mIUqYghknN-H1mf54iwiU6Q1ikuaH1-5-kpegbGhOaVcy38LEgIHpCpvD78DQ=w2172-h1852",
      position: '83% center',
      size: '95%',
      marginLeft: '0px', // Horizontal margin
      marginTop: '0px'  // Vertical margin
  },
            {
      url: "https://lh3.googleusercontent.com/fife/ALs6j_EQschi2OWIDH5ExqzKjF0UaezmLW6ZpGYV46ZvkSBbXlUOP8RK6VJVaKZWsgr5trzDX6AnUwLLdQBohUDNH9USMG1LLvMfQofG-1V3BE2qdhtKp8lLNWDTDnyaKaDThtRvmqd26U5MN7IKu9gQPSpyy-RNtcM0lnLePFmCk24-19c-ahLCpci3E_knhLNAnUZRceAjky8OI6XYvhfoampw55cbXq6wYRf1kgkMX8U1MUVrLPteOHudSStUhunKVhxXSp0DJiqC_uU8_UENtnH-rw7jUh_HFGg4jGjXy-jlLS5QXd7Zau8eJkssReW4Cxt57la2nxpnn4l9LOWnsGl_TrTA8nNem8Sn8N4x7KkxxuPI8-Z1RdMs7DlUHP3foMxyQQHLvjN8bMwU7qmTmuprkaXrSEH4A-0z-DtwqEK1WDsgX9rOfV8-zzk5VPcKPG5oraeYBpSOa8G5ug5-VUUf9fCqvS388yXwsqkhIo5YROdrak90u3oBFZLybKvs4BCdnXcUBY1A-9ehmPLsxBlTa7GWH1W5NQDayrws2TK5kYanhKFKcUydNlV33i0wWawedkAPMrof4Y6g7tbZox5Kiiqf24m1N3Tzjo_l-RZkzi1mfHH4gkm3Kw7bIayPuQb2Qp_pXVFnIi0kMayKdUb7nXRfHfOetFcISky85ckb04s8CyFXhy5nYl1OZD4UI_zdiLljjhIGIIQ-KxqoGhXvHaMkAwUyW5_PNPCY6dKnRbMHxd55_ShkFwwzqceJAT22LJNlcapamZxctPM_8IqWCOg9gLuKpQRdqbG5oilsb-QrrR-_GleffWl3O3VUlEEL0_MUPTSeyXUHEBYI08nfuOTB2e6UYqPrpTDFbu9Y24wnmO0XOI9hxpLfyiZ37DEBEyrHkuAQ9zaBWQ_eV7SfyFEZolgd_AG7ieQKqvf2kLaHfe2xgakw9MoBUfJny00WRvewD1m6t_9GCpPkzQ07zfStnQNmR1QoEfZ4ckrGSIcv4NFxmmc99rMBr1I01ruC3HWmeQvLaaoFGkSvLzcWq1QIjnQ-ehCCtXo6sc8iHJ5vUJcZ22nlcdrDEFRuWiPPMtdCaIZwGqFg9J_hWruZyW3vyPXG5g8_7qhsEHtd1ObSA-nKVXgOv2dcI1C1fSe1Vi1yau82Lketyd7PMXSkKER2Wtt2CPHSvt9tktZu7Icf3KQ0obPBsO1rCiGbrlVAFVkfdMsDAs6IOF87TiMiAbx4eQOmSh9fQR5M5wo7P4LayZhF96j-ZPRnijapzgNFizRFGd0YG30_xL1LSiIG9eonRP0MPkdsztZbbit4C6msdQy3GaKLP4k8smgcVRCsqimhEG5TCQHYPochwCYLVo9U_iAgzhym7BNM5SAqekOO31wxj7sdmI2HdQFhXFnFxNP5_2aIV8SmPFX5ZemIoPm1XpguPDNmRpWsYHXqVpJkNtZp5fSUJctuHAnXFsvc0e2bwivY3lJ8dDDcMDX6ZvJLSTnPpRftUAaITOcsDsur2du5YXRFLApI36a4jN0u_HmdzSEKKNoChXFN558QVUyml3fsRt4kOgbOnl5lfUiKsrecsv5KLnz7BkipbX27dR2iXdng-oDv3XCC79PgnQ3XMaMlHEKQ_giOCozEgzKGBVFsN5KgXmempjT6DpJFIJBOtyRpPukeXpktW627MSQh1TgAlm6kN5kOcqLq3BrjHMesc8B9PBQPgHhTIFR9_76MPLSXn0f13_m6iC_5N7E6aVRug_ya9JEJQA4mJOVmjfPiSSD4pqVhOxH5gyYZFLsAiJzTAHiRejdcPdudWyPhCpfzIIr0gzRk8geP5maAGb-ycdtc7RswKthzGE_Z8-rHh6G32_axSbCvo8lbEz3nsYyVCH37fTBO26qraE7DYkjhHH3R2uexZ2AvObPtI412FlXrmQnhCQ=w2172-h1852",
      position: '83% center',
      size: '95%',
      marginLeft: '0px', // Horizontal margin
      marginTop: '0px'  // Vertical margin
  },
            {
      url: "https://lh3.googleusercontent.com/fife/ALs6j_FenL6J-P3kbOaszccPma9LSegKyNw0D3xv9cq3lDQHzku_38q5LCJ8ocHjmqjuwsiWwDmHocci48dIZJxET0tUA9Pilw9-XFnFWnOMCaZ9Pp_Almk69Z8xIzAuekLk3lJ4ux95WkYZmEZkR8rEl6vqsPjFT3bTrUav7nWm-TDAvIuuTm6PK314LRiBsdKrwPliliW5tUQSgRZrhix_sUsN8qfNXJQOSdwioUVBvEZbSK3ISNK0obaTx1eE415MKPaVdw6wMKByfl1eGVKOG5Wii7RmndyPGeMC2YJLg8-KUPQqF_Looj7SxuTbtytqTFJtZdK8YyElZOZNyCNd8yhBpxKhBG-B9B7Jil-dIOsRDrcOcggpxp8BC6Z-IbIrgEJCnREM0lB4INmvOYEOv8JLUsXpWYV8FAM4te0_VhrXdxn_8e69A1SVkXOw__5JcdaSxtL-i9Ne6U0rqQEW6dio9eHdy7waxTz8mjrtkgXoN6IFoaaEShluZtrwp3gPoJiWkdrsWKbPU2G6H_epELz-6es_kahiTSa0ZPl-4dWECZlydgY09Bhg8kaReLj_ZxOMzgPV9sBahg081B3-pssWupSn8ZOUyKJsNSrwb_9o2vVm1GWotDva-JpSaUOucu57VI_osJ5BsMSVN0IfVfGUyRhFFzOQFMtzlgwUZunRo8FKv8J5WuLQLAnxgbyKhqCpnuluUIS8_Cobr9X7MSfWwQ0oWnWcwC77Gi97ckMvK08Dfgbm8shhw9QYjN2bOIQM0l2908gR99jvIaDj3kqstFMO6AOebiHGktKbsNEJxEqsz8B7ZKWuGDgh9a4D4lrZZkg-Zo7nOiNYNTqxfjOywoEZjwv1u2pnelhh_2A_YFIRzvn3Iv3NsJmaQ_eSdh-5aUck8hhrk8JwsLiyHxwtiCqhbt5MJRHywqN4dcwDPRRryCUbypG6wkxk81Q-hd91h_jajoCYKCafE3T3GoG4bAT5gLnG2hz1aPM-RU0FUiM6A9qjr0Yj5NaobvO6vskiUWtHQTuuxgKbdXF03tE9g60DmDmp-nr8x8Xt_yaPmdZCdoN2Ojc9BRY7ARz_CtY-ze4Wq7CfMG5DtumEEZsh1k7YoUrWazKmzyKfUkHkWeagVYcpxm1yVfyJb0tJDwgDQe7OcA5a5idpRiVQOknLBUGhzrGw6cqOCQAT2toB-2Xj1mToN22O7gp4_NP_A_beDekMpcd6H2DrWf02qdYUwuJ7yeZFW_9ZQphehkS9a-LomLR4bBD9P9WyKD_58XdI-5T1qfn8y-EeKDQDlpCbX08dTU-tQ6UuVqUBafaqRKfMJEc4yn-LmVzV7lQiQ3mC-qr8sAWwWbJhnnPZJCS3GxdaMMJiWmZ9YqWQXsz3fNP9gBRUEGeR5bJJ6q3Jd7vhHtp4-wvkWwwbLt-P6-pmzorAN2M4tn9voCo7cGcikyZhflIZmH4et5g9q12bW4z0hc2E1vSDDdYMx4gDek7tMpd4Nue6GdWMVIGcLyG0Me6f-hjjzxy5Mx9cQlB3-j7dr2UH_wstrY0h9IrMWvknLv474kPDUnvOHwSKS8X0fHPCjQUdWqly_RwC1zsEGxOAnPokfjWQkKccfBqN-KCyOce5Hktov-JguV0wNi8Qs-31lsxNbVDv1EgTl1Of2W8dIt0S4EwpbdIUhXgXeQwpZv3YaAxtY0nTFzDz90uwD4dRG2TY5-qfk1Wi7zxhaKVBKKZG8GngglQSxSF1XhZNAN2sY-LCXXntOFWhhmyG0dxeeY4vn2edILjIYJEaR7v9baap8gHI5pQcbpsqaGUmnSphcobRPYl1mR-PVxYV7lSuWtNUgbkPQBpPUl-Legy2LEVJch06HqxGnIp5VC-aNmV3Jug0PrjGuK_8NDIl8xBvKho9UJNQtt2ynv8dpwkgF2WBwSoOxWIr=w2172-h1852",
      position: '83% center',
      size: '95%',
      marginLeft: '0px', // Horizontal margin
      marginTop: '0px'  // Vertical margin
  },
    {
      url: "https://lh3.googleusercontent.com/fife/ALs6j_HjqzzY2ThwWnrLsm8kIoWsq0iAnk_5B6XR0HmdUPwZ0ny5-AIYs-pju9a-Hc6injgHEB10MV8loGUgTL2Dp0LcfQE_98N-XqWJaJJ75q8JpEOZDzqczG2BvIeqF0dRJxth-dJlsNKS-X403qg7mIThSGCPtLlPMlHhCul-QhnbPFyDWg7b1luxVPUPqwz7B2rFgR16YwsH5EvJayCAo-SIBqw3H0AkD2e-NVogdxAQ0feWs_ZRCsBcls6JqUbW9cWNQj-0cJIUcHN82R3_q_bntpMMewmFm7jt6QkBgn0SDLFjvZ_wu2Ga5Bbr24YLh406u-O0LWfww1aNVGHVLsmJpbg_oJi-_Cx9OnrJ3lDEhZNFPYxLMeRM2Qd5m1pPxz0KcM6-tyvCE6o210XOWgrFNB9ZVoIAfJWJlswivLqvoHvKebSnERiTYDBQVZDdONzgMOlGBfsxZPrjgg2aJceufLfsZ4vgYJoFnw7XSADAZELzV7PYbdkfvLYMv_PkLFT2Agr79qvdanS0vyoh3Gwzk6-WYr4ocJZ2c-tmVhwtymJ7QL6_-8YxBTJ2gENDr-7FpquXYWfOhLF99b2YtPk2FpxU-3U09I0qRLg9JMK1G8mVMH94CpIgFoYE5IyG6fu1CVdFTGTKitNPlsugEIANGRPgi1AJVvrkJ1K9DH--SV42Z-gs5i2ekCbReuDeTMbV_B8gKCwVgLleo1oDmFq73jmVLMYDBkoiY32BORD6fW5nmJOIGGZ2ANm8JLz8eDyvVWtxMrP1gRjNvzGVqQoFvJRb1Q7PlOhyxU-W9cLsb7qQpnKol7W4OogHHEeriy8Xl73aqp7YLc0adisfFxZZhTfsU-ROnEpW7bT5dIOklUqw4bjVmHDOQwW_BQNtN9W5pBoPdoCCMqqUjet1Gg6ln8DTvcmsDp9QkUQKWWtITRgj1pVrvZEoPsrUcvXLTlsRVSivqur_ltnP57heflVmeJjBAQ-e9OG2BT3mqc2tR4JmFzy0biOCqEVftCu6gwIoXxIBt87YRYNMQfPLfYZ2lnKlYnvY4SQqmp5PtJ8fAnrFAePuHMWQQeaggOFoPzjbniCeiPXhP6Jf7kJFbXuHGIz9r4_uOg7QNGsXZovBAgqxzM1hujlBiOxybMUJLcFaxifxqo8C_tFHzC8kh4wnHfzWGpDrmJqP4TST9iukV4lnWsJe5-mc2TWNHGkt46SGo8zgCeyIVw1z6fe5QVZJMc11X6eA5F-dZ1MTfV-abbssRusCuXWLHP0iBRTSHnp9j1qoLG63zY1YDPT5KbcW7OH3dS0ZnSusP3RffJASJpL1kHLVSEq_6tXMWpwYUonzKz62wFUQPw7wOPGYZRpp1mOmPxsO2awyDSluR6dMLvUMHNM2K1SPvadM-KO1yIXDgG11OZ4Ew4foOX8a4rHlyEw9sF9GjxNnw_rlnHCpo4r7TZwDbSWm0rq_B-ZwUpsDT6HW0Zyf0_CiCYshFrx8qdT_jL6oIG1p1-Sed1NXKhtfhQOlZVKZ1WQR2w_BQoU6W28ZZ_YnhgN-_Z7VkX-9XeXjt2le9p9keTQBvCyG7GfBujOw2PuZmWYJaxs2WjkNjNW7WHaxloE_oJZ1lW6_U0Y5oKafg8jzVt60EvI9m9TwxRm8HCSHs9mrlqsnD0f9vPLr-e4KKoyv1X9YV8rcr_z0jTjQBjgS4yXQyzFPO6bP-5DhWvzYZ5E1zo6_uoFEjEon5Zguy9fxLBz9W6X7S5ynx4lN_XMa5volK3Mqph4yjKfDscGRstlVzaEVxBK_6ZDZjgQdrg0tdiY1tcSArFS4CrGQiQgek3ZXqOK7QaPB1tVhnYKQ7wpi_QOU6QpZZ4xOeku4c7A0sDlsKn28ofJxd8lbipofIP6PNVTYB399ZY7qXC6Rz_61W6EOSCpxZ91AsehXvSz6Fw=w2172-h1852",
      position: '83% center',
      size: '95%',
      marginLeft: '0px', // Horizontal margin
      marginTop: '0px'  // Vertical margin
  },
            {
      url: "https://lh3.googleusercontent.com/fife/ALs6j_F5mlZPmmIJhuDWJFbv221wAa-KceC1B_-3sSS1hhN_ZucRfdAiW04iNAoTeZuJ03Mat2qceUigaO6_9DeQx1Ic_zSRjX4oJeeGpldbD_-CCQUpuBk2JHCC37VIoLT_d46t9hHZKgW7D0EZzoKiofoiHDGIejvLCPYB4YmV_hqlFCq4JzSEe5nU6vhWdGJ7MYIF3dmunjCpJfi7xOcbPHDMGZxsJva11gbJg2HcjqnuqQVbbxtjBYRN6PfwsOzhcLVrV_cnEObixs_d1JjFkiPCTEdF2o5PicMzo5p6rMq55EHDNIKK9NeN4ymMYIB46Fqz7nrx3-zGLTEdUHCFOxHI_2h9lWO7by2OySOYeMwzKRSSDtEXp_rOAztLaUmSKNIyAyg57zz3Xp4-3ZTF8j8w729tWomIxx9QZK8ofJt24lwrOhm0_ltHodF4v9IM4F3rYHAfBJO-kr6Fuyb5csjWDF87RsrNfw-CK2RXT7DJ5tNcuAi55YcllOpXd4_4BwZgYi7m1XQwFuf-9GtBRG4pJmyLQI5njB49nzW1iSkksUbJhrObhXj5dfElM6WTo2noJCU65Bw923Ph9Kwfx2C-tL1dtxX43MamfhmNgUaQeEQZiaNT-3ZgQSYtzO9e0ogsEv0VCfxKX--j_ITXaa1Ce7dmaNlHSn_-hDAbk8hl0yXi-M6M5Ki6OEGhXePELZfwEB_gyA9onj1tGiQZinnnXX_bjXQS2sFGKzJQ20OTE14TUFfAR6Jc3rmW6_1jCGVC5aIXd6M8i5NHH-D549NmzdMk4j1xejVnaneZhbLI5R_XfFmv7uPMTZhmVc2-YSm_EYLpL6UDx5cuuuOw6EJJumdGrT37fAdK_rhrrUfR-anydoCc_UNxX7yUo5p-2_DC_vV2bfAs6OJr0jXHuNPz-Ls6UiHRy1FqK79NeGBSYnrfkAOLDwRAN_WaZayr5fO23dDMgMPyES59iY7UBXEI2SA_PvlJrNAnh0QxzmdgFJeTRxnHF0gXdR_bm90BNK0ZrqJRFHDHVtpx6ZJRu_CjhXSaGENgREJxvd7V_mdCx1KSfTnWtyIzKvGUXIIDU5vgICTr9KVKZS2BKWp6jlkGtB9lRnQLrKsdaeVBubLzA145RnVmO1PgKDtV-0fS8wpB5N1mLHj2_iR0QE9T1Ds24x78yEPIWpZhqtg860QedUrb3FZERlvFRO6dvYrT_IFw1XVqo6QpGkSCg6D61MDqqCyQ6LwS_VZw5rEJbtwrEAGMJVcNtblIr8EsMDGnDQ0Gl7Qr75OgAXcsPajaQnodnSnnR0h_g2tPVND5BeIGZ0A9ST_JN5z96CwJCKo87Hci8F-GdmoXVWajbT9Hf-CWJTdTcSeulCSRXeHalti31ciPQKChhbMaP8IM7wU3C8th6N4NmPZdc1Xv8YmfBO2awmjUviXsT0QKe74oykeWow6vq1i4_FaTyCf7tA54-o1z6Bp5kASc_UBadX2qXoazW6JqPR_j8yr0baLfdiAJbpgfyIZkHIElj94kt8EypdyfphS9C88LYp_2N95QXSsvADCde79pe6LZlduehxt1yTf-7o2V4NU7EgZ1fXyp1Niu3R-NKONkYeGhh6mESlVPPxTdjlz0E-tuHkYYW8iBoigNdMMVGRAdNNfF0ljwOyy1W39PZIWr_C_nvRgtmo9gB1LjVDm5PPsaACJowqfOidN-BykPKVp-FpR3QCxq5vfbRAKN3mewgesXzAJvYMyLWrTItXS4zkWhBoDXubwCWnb_ITnKlSnWU2_a4oymI6nFooIRuwuwPKsyBY_5wJYNRj3Qxzlml36wD3GQqxO-Uk9_qMJ3zTZnv450JkFsI0FE5eVelwGOs81RTejP4DdFXHUX03rwOjYjnthjO5ulErmw_17bbYEBRw-VPBSL_Cn6CrAmvkKrJRxxTQ=w2172-h1852",
      position: '83% center',
      size: '95%',
      marginLeft: '0px', // Horizontal margin
      marginTop: '0px'  // Vertical margin
  },
            {
      url: "https://lh3.googleusercontent.com/fife/ALs6j_FIJAwXP2kO9XVmi-ntiT0QkjFAVVsrQjimF5kaOpkyqbalzqiK2boZ335zIst3Ra9r1uiclj8BY0StQ3j8UYERNLgqbMKEnwQaWuKauqbCH7SoGy0AJUB6ZtRDeZZGd4j5rR1wA6bQVrnOcdu61Jtxws8xDq4cBZt9wwcBL9gFGwJyS884KkIbLiVlrJvTP-EHxLI9L4CiTaUdFo_Hylz9zOIxO3GiOx7rj_JN_r3R48r1oJ77j-8YoTL88O2ndMTe3TTBHAPH4Z8kuUVnQzCbJkXRYsUodKke3z_hpI2tgcnRZZ7gaJdVKgjN4EBFghpL2lZSHo0XtPRep_KjZhYPUEKvyjCcFDlncChmA-UYZL0BXDTepTEp8m59B2wgcvoL70KjfTEuQ8d8LYXik3JJj6i6AjOn_S4zwUyl-k3G9bWV89CEUTZSkPcaW63RoV4MnbCsrDXGHcQlRW3KSyNPiswtWmK3_ODuVIU6uuYRJBD4-hI7HWsqH-eUXbiciLckG6w76M3H0IThjIiGbxwYKi0WSwTddKwibrNFvU5DTXMmAHPgDXr6n1rgYQmVY_wiRmIS9BD5OFSIlFZ1rFYxChqgKGAe8n21O7LGiN2hXBmmpAuJ-Azorsgyj2yHjFeyGmiBSdaBsarlOo2gu_2Es7j71RJxPqt8YdDHii92xUe7vXG-0bBxQhW21crwKxfZVzCGJi7VEZT6vatxF0sNJQViFfnXWge_GKsbIcaBTehanrpMFWt-yBCsWAT1BSMR_iaWtV4e8h8TmPre7STEPzcc9zNtnb3sYlb_Ubp_UslQIbnimxwF9QYC8DaftmDf5NuVcagPPnolg7Caf61cMLfKZu93B-LsUJ8ZD3h0M1eHCv4rT4L67j4NjXpGc6OYu7wU_PwuJW9mvCmeRs5wYAYVr6iDYTdnXy_VS8giyo1o1JmqWCli6Wra8CAma2K6xVIIJu1uG6JLZocYQYdKsF0Z_HKDE_aII1vf3j11DkuFxUbB8zLovAXL4iO8GjRdpMc41A2K9ltzzjQvsPJ4A3UYaoMwOvnroFz1KyTMGJPUBdDqzDs9QVaR2DuZwTjR4TAxffx002YeOR9G2PudXYW5VRNUihtLRFhk18RrnofNQNmBrYP4sumJqJcfxbdiLFBi98on5vxXN4E88rPJ2zCwYxnZQPr2LZNeK007o_AkjLz32hiGsL7bf9OJxTXDKfBH6JAGEM14ojz2PQVoDMdpqdlBYaBH5oFTKGLDftAGZ9tdEBmqZvoQDAhRu8chd2x594o2gIlQvbABsArmyXaDlFSn70qp2_zqJP1ijCXMwNRGh1jss-DLwUcSoD3YbqBAeoUA3Q67z7TGfX2Jc48UTw4ctLlOaX9fLy-zcgH1_GHcQPVE-yszXGE329WUyIcv7QQmyC5y2Vp6e1rT0DOEwqKOdTmrroNcxio3TdSp7NOkkFrz0_YoskMKr9fLPkVxU29K396pV0Ot4QOY3I0XgLBizzTe57adsdLiaF1brkidiuRRUY5SjVqdcH_uQV10KcMJRMxsGXekN-M1YrZXkbue3C7b073JpraDy__R32NfV4F-UTi93p0t5a7FmiyksZsTmdd0ZTq-2kCK5ZNOeMqgz19_mAxprG2dHOQubTBRVyG0Qegv_ZtKS-UHDNbZ5UaEZr7fZ-YZ5k-ypMBA-_pxweZs1U1bHULDaPNhyRybG9Kk1dJtrLIoQjBpWmcnXLpBw4X-SM0pcJkhQXEoXDhOQDhEo-SNMvlKDhHvHjBXmcu5jTtWe-DVCKecApzUueIjmcEBNTUzUtrFQBjZmsYnmBxIgAFzsV4BvezNbO-ssS6qycfJAMfws5bt9LYxsi43RFMjvIzyoHXMSYkMq1_3R4FkHUs-GZzyrYTB78NIj0WwTzWmXWvGvFOTWsSOt8dOk3MO8A=w2172-h1852",
      position: '83% center',
      size: '95%',
      marginLeft: '0px', // Horizontal margin
      marginTop: '0px'  // Vertical margin
  },
            {
      url: "https://lh3.googleusercontent.com/fife/ALs6j_GcnvE93Ref-UFz2I-nXaktMMsSlbcTkfV8tBHDEZBM2t362ygJYnQLC8nr98CUivELxxVhA8bXsKMCyCH4mvwJg7NLJNRyYjT6ZyCyxuVFZK4O8anjLmxph5lExKGQsAolQn2VZHVA8mb9hnk3YKTayTIMeCawdpsCqo03n3osECSxnLJG9vNmBiSTeRDK8vv6YUbZyQ5KjgDi5ikp0HAypvEIJEQcT2Okpe-1tJogPUgrzwh_ArkvLEwKmmbafD4GjCUMG53yqBLq8Fq21mcLeOUToxp5hvbd_2axhnMY3ZiYWsC5VeZkNGSB_tXfXNWOaIO7-5JY9nM0WG-2uF-my1R489jIlsR-owkU95bxrdMaJ37qajqlybeyTAEeqLomO-cdrLkrJXn3XgounyCRQefk226cbADrGAHp94Bg0r0oLZwOTGtnmjJg0_T-_RnoYKgpR1FWBergZqTOHwiejJnC5WvqSOfWZmVoPP99StRzunPKXzHU8f49FmDkoumHUETQgZ99V1maBASEzIu9VvPiNUb0XYlfOpze_ChF9TxPSw49wYmhu1FC8dsRe-wuPlsxhKx4LyuNm88nqsgXsCmmDhG-BqjSfWpyM60V6p_eK9DdPMsFGN41YMlmicOIJRBz2MEWiIthMFtUrT9MXPCx_keLBNeQZ1J2IVpvMWDR1JPNd2FCn4LyUtYwi2BrYnmghr6P8mDnjWnGphlJIdyRWdrRMvUtSBK1GN4taXo7M4o9uD4zeHLSM34eH1cG4n-6zcKJimtsa0ZgzP-mS8gjdFAA-X42HIj-9T-0a6dSwOjyIiBQRKzkYN0C2RE4rZpmPpii0JMUt4DTHy6Z9UQYFotHaB_WaQJWYOzcAkM-yDPaU5pwBajKlf0mJ7CfkqUZLcXnadx0Nx_q1Be3yRxG3eZuYPUKhJUnbz9NYXkay6I38l6cOqkFjsxTN96Eg1mU2OclrzcoWb8PD9DnvAxETXYqWLeC0opRJh2r0DK-ld5WCNPiHkluKCEVppjpYHV7Rwtpfrfkjlult_QAWjcC_EMXaVXiaMEkFVa6PJeIc65VIJucn99OIZ67yA4JhfibnIT8QYAoYHd56DH7tKZ3kxVOSNI-qbjJzdYpdXf3GjiM4RmEP0EgqATYlPx8x5k1DbCKYpR1_Ohlw9Clg34vLooKPLXAbIFa2MeNluSC01PUXKEnFtxg2VUUb_H1CvN1bishDgZ5nOrR91WVFhDsLbNMAxHMk6NMbU2EAlJ9XHHvtQqA_MUwkRXykAerqmMHSySl2Vdeg7DgOIKcnNnHE1JiFYIF8WBTw1UHIUiv4j9KHNUE0wsT4LvAnJgfvB7SrWHItungaFm2YlxQYz7EmGO_tibl65sq4jocJ0qgJ2NcSBToCasicIDiR4t-LhJ-MJaizCl8GEB4A5ZNrKQFbttOh5ZNotItQmLF-EHElpMwC7Z5hcIvBaOoEbgYE1UggnU_bgUta_rdWA233DDF6MnB7BxyIzZ8oSZUHLMJI8DN_bLvMVusJqdhtC3SFkoj3Cr6QFUwEwbUeLwrgPDB_qA7ELyH2vApSmrFol6ta6G8zGlNV7J1Ta1W7_YU4EJOnYw6uvQJ_8aFmM5wvN3HjBqn4NN54e_eqZKE6whF9TPB7O2SeQCny4kIPwQG_bJ3FrJbanCWvzBHxalRjKfzwUd64efQk5j8a9JuHRjfqYUvrk0azHFy-Iq0aP_l7oZphZp_a7QDBaHQN-mEAZaqlhdPSZat_jrjM74hIe2WFFeEv6xZoLu_8XDcPTKDbPwT76gNUL7-9AVLrh21Ieaus6N1k_YyQw-NdMNnG3Js6guepgMpCGT5-AqUmFH6PgcL3_MRoBxaPUfIsnbRQMjGRVn0LZgZc5Tpa2JEupz0mq3iF3PhN3Zt56SxC240OeRE0UL74NkLxQ=w2172-h1852",
      position: '83% center',
      size: '95%',
      marginLeft: '0px', // Horizontal margin
      marginTop: '0px'  // Vertical margin
  },
        {
      url: "https://lh3.googleusercontent.com/fife/ALs6j_H55QtbGOPpwIm6nV8y0ytefMIJBCL9h-U_56sUBBL0viouCSXU3e6eT_Umrw8uaeei8ywrtsGhnRxlun85ojsIjrsGCBtUS1Qbm9Cgarnu1dYUKdV6nOGbcifNGa8-eNwuFF-Du-HKcTneAdunbtGZOCyDoz7pikgbqu9zlCBu3nmDol74vPVkYDvTS_fetbo1yN_r-rgP8Z9snjzuvOajhwp8RdNsf1P-Ut1V0SnlnRLfpu59-mqJrROsBP0qle4xjGawLzV33kAFO0f7Lp4xISNfbdax5myug8h4ljUpX4L9pWtJ2PRP8kDFCxSqx4kXswiTsVftHJA4dYyFQ2OsFN5xJuGOTbvduhvNQO4WRJ0C2KE7tStDEokQY1WalKXxZDMVrmgqD-HU8eyuCTJvLV5A8yZ7vIrjUIj27ARZ9xYaa97ZzPiiKBMiI_6D0O3eTE2zHtwlBbAuhjmOoWkSQfFCyhb-Kl9MQ6ZzUhLFObaiZsDYRJGAGBdjMvf4YSGnFqwMwFb1wjxOQrijtCgvk0hfhLYK0Aq9QFKiqan0aI4Hqec-OJNiVatkoyTIxyIeS-MQlcE-4G98StVCdOnPDPcKzjkKDTfS_e4g738nEBYKVtE9Sq3rEzBnmegde7-Fqit_6rplXarU73Qx9XBedBQB3OQTmcdrrYoDsmQ1SCynFdNxCQIlx9UyTFWe6dZ4YNuRX0dXRi2mIz-3oCYt49salqotQZ9-mcW_yfOH5sEw8Rs91hdk3s3qFPjsrEJDAT3eXiNjMc2nvXVcFfmjtdgjwMbjHT4cL-jCYF8fE_NePhL1AsARBVwcoE649ohtuJApbASGZghxuA4JywvHOH1PkRXaa4_UqJSh9v-wzTPTwCinys5TUjWVdqaE7-iou7A66BHiy5bqPnIgyTh8pUDUd-qo_bQP-buJpB_KKE3TGJseEJFjirOtyci0vdRETyJjuqVfwDDFljFGUNiRI9nfDNL44RGxM4duHrxjhnhO5AWDwnxjHRvDMturzNyJhBxnAo0AO2iI-CJwOtLudLeQFOzdhpCOqtgHlRJQjbOBpR98N7p2xGaTQbv8GPm53icGbldsrbkY8AygdVfjDFZLyAbj-7OwhZK6XLcQjzTm-YdcetCr1sP7EnyRdqIw3CDRNVvh_MzgQLiJMJudIOyX6anacggXG4oWfbJJRFkIi8srMD06aq31YvtFSit-UpjOyNaKrwqrCKipiUZV9CX5a8k0Oe_jCrxRqkoIBTEW0WiHm2Sam0JNSTti1K_Ms_wLoDd_F_xsI3EzI27bEYcxqIoRIXFUxJ-CQfHLrISyZx49YlQ0QvkYxvBW7a7KRgU91TR1HsqJuuYLgH4vKhCnwfpGpsHCx5v62dQHxfan19DZtYlD03-dW4OvveAtQNhBLug74Wy4B5Dybhl7G-Ich_PTiyGFPTZ2GIbQY6zDmjxwOq_qiuDntgb5o9ir4Ks_epzKICDm9VLJPXeoWSFLMQ1M1ozB72bCFdPb8n41I2jJsDvJ5MdwHB3PLGUHeHYezyvF_5gxblj453VZMkkSobGTGsSamtBmKdFqN7jPmNuNRqzD5Vax-gf3SDeV7UM5lAftyZSBPIhnl4swaOxM1GsktggmL_iv6sXBN3uF7NXFKMndsqP42zfMC3H1NVrMw9wObtE7gWCRpWongXpuBQJskuJgmHnUVeCEm0bM4f91VmRjg4ZLYJI_jZzQHTj9BinCLQpo__cRRmliHfL5BjGfyaSXURKOa3ynpV04abaJLvbrxiKP9quY9cMaaXnWjey3Dbs5NS0qvgnyPd4bPXebFeR6kGcduFprRYG_5_Hw3Ffj9lwSooIEetniZ-bDZLaqH1f2CuRQynFidSWKFhGhsuj_xgUSEA8-0CraeQaEMjSx5ihmaGstxqV9g55BlIHwtfal=w2172-h1852",
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
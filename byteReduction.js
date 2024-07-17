javascript: (() => {
    var url, l = window.location,
        baseUrl = 'https://res.cloudinary.com/patrickg-dev/image/fetch/f_auto/q_auto/',
        img = l.protocol + '//' + l.hostname + l.pathname + encodeURIComponent(l.search);
    var getJSON = function(url, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'json';
        xhr.setRequestHeader('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8');
        xhr.onload = function() {
            var status = xhr.status;
            if (status === 200) {
                callback(null, xhr.response);
            } else {
                callback(status, xhr.response);
            }
        };
        xhr.send();
    };
    getJSON(baseUrl + 'fl_getinfo/' + img, function(err, data) {
        if (err !== null) {
            alert('Something went wrong: ' + err);
        } else {
            var orgBytes = data.input.bytes,
                newBytes = data.output.bytes,
                diffKB = (orgBytes - newBytes) / 1000;
            diffKB = diffKB.toFixed(1);
            if (diffKB > 1000) {
                diffKB = diffKB.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, '%25252C');
            } else {
                diffKB = -1 * diffKB;
            }
            format = data.output.format, percentChange = 100 * (orgBytes - newBytes) / orgBytes, opts = 'w_800/l_text:Open%20sans_320_center:%E2%96%BC,co_green,w_300,ar_1,c_lpad,b_rgb:0C163B,r_max/fl_layer_apply,g_north_east,x_30,y_30,e_outline:outer,co_rgb:3F5FFF,o_93/l_logo,w_60/w_370,h_39,c_lpad/fl_layer_apply,g_north_east,y_54/l_text:Open%20sans_84_center_bold:' + percentChange.toFixed(1) + '%2525,w_370,h_96,c_lpad,co_white/fl_layer_apply,g_north_east,y_120/l_text:Open%20sans_35_center_bold:REDUCTION,w_370,c_lpad,co_white/fl_layer_apply,g_north_east,y_206/l_text:Open%20sans_35_center:(' + diffKB + ' kB),w_370,c_lpad,co_white/fl_layer_apply,g_north_east,y_238/if_iw_lt_800/w_iw,h_ih/if_end/', newUrl = baseUrl + opts + img;
            l.assign(newUrl);
        }
    });
})();

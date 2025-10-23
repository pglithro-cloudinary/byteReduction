// byteReduction.js — overlay version + proper encoding + clean optimised link

function getJSON(url, callback) {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'json';
  xhr.setRequestHeader('Accept', 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8');
  xhr.onload = () => {
    if (xhr.status === 200) callback(null, xhr.response);
    else callback(xhr.status || 500, xhr.response);
  };
  xhr.onerror = () => callback('network_error');
  xhr.send();
}

async function getOriginalBytes(originUrl, flGetInfoUrl) {
  try {
    const response = await fetch(originUrl, { method: 'GET' });
    if (response.ok) {
      const blob = await response.blob();
      return { bytes: blob.size, method: 'GET' };
    }
  } catch (e) {
    console.warn('Direct GET failed, fallback to fl_getinfo', e);
  }

  return new Promise((resolve) => {
    getJSON(flGetInfoUrl, (err, data) => {
      if (!err && data?.input?.bytes) resolve({ bytes: data.input.bytes, method: 'FL_GETINFO' });
      else resolve({ bytes: NaN, method: 'UNKNOWN' });
    });
  });
}

function buildCloudinaryBase() {
  return 'https://res.cloudinary.com/patrickg-dev/image/fetch/';
}

function encodeUrlPreservingQuery(u) {
  // Encode full URL safely for Cloudinary fetch
  return encodeURIComponent(u);
}

async function loadImages() {
  const inputUrl = document.getElementById('url').value.trim();
  if (!inputUrl) return;

  const baseUrl = buildCloudinaryBase();
  const encodedImg = encodeUrlPreservingQuery(inputUrl);

  const infoUrl = baseUrl + 'f_auto,q_auto/fl_getinfo/' + encodedImg;

  let info;
  try {
    info = await new Promise((res) => getJSON(infoUrl, (e, d) => res(e ? null : d)));
  } catch {
    info = null;
  }

  if (!info?.output) {
    alert('Could not fetch Cloudinary info for this URL (CORS or fetch blocked).');
    return;
  }

  const originProbe = await getOriginalBytes(inputUrl, infoUrl);
  const orgBytes = Number.isFinite(originProbe.bytes) ? originProbe.bytes : info.input?.bytes || NaN;
  const newBytes = info.output.bytes;
  const newFormat = info.output.format;

  if (!Number.isFinite(orgBytes) || !Number.isFinite(newBytes)) {
    alert('Could not determine byte sizes (CORS or restrictions).');
    return;
  }

  const diffKB = (orgBytes - newBytes) / 1000;
  const percentChange = (100 * (orgBytes - newBytes)) / orgBytes;

  // ---- Overlay (preview) version ----
  let newUrl = baseUrl;
  newUrl += 'f_auto,q_auto/';
  newUrl += `$percent_!${percentChange.toFixed(1)}!/`;
  newUrl += `$bytes_!${(-diffKB).toFixed(1)}!/`;
  newUrl += '$stickerWidth_300/';
  newUrl += '$img_current/w_1/h_1/f_auto/q_auto/';
  newUrl += 'l_text:Open%20sans_320_center:%E2%96%BC,co_green,w_300,ar_1,c_lpad,b_rgb:0C163B,r_max/fl_layer_apply,g_north_east,e_outline:outer,co_rgb:3F5FFF,o_93/';
  newUrl += 'l_logo,w_60/fl_layer_apply,g_north,y_24/';
  newUrl += 'l_text:Open%20sans_84_center_bold:$(percent)%25,w_340,h_96,c_lpad,co_white/fl_layer_apply,g_north,y_90/';
  newUrl += 'l_text:Open%20sans_35_center_bold:REDUCTION,w_340,c_lpad,co_white/fl_layer_apply,g_north,y_176/';
  newUrl += 'l_text:Open%20sans_35_center:($(bytes)%20kB),w_340,c_lpad,co_white/fl_layer_apply,g_north,y_208/';
  newUrl += 'w_$stickerWidth/u_$img,w_800/fl_layer_apply,north/';

  // Show preview overlays at three widths
  document.getElementById('imageBoxS').src = newUrl + 'w_400/' + encodedImg;
  document.getElementById('imageBoxM').src = newUrl + 'w_600/' + encodedImg;
  document.getElementById('imageBoxL').src = newUrl + 'w_800/' + encodedImg;

  // ---- Clean optimised image (for summary link) ----
  const optimisedUrl = `${baseUrl}f_auto,q_auto,w_800/${encodedImg}`;

  const newText = `
    <p>This shows an example of the optimisation possible using Cloudinary.<br>
    The <a href="${inputUrl}" target="_blank">source image</a> was originally
    ${(orgBytes / 1000).toFixed(1)} kB (via <code>${originProbe.method}</code>),
    and after optimisation (<b>${newFormat}</b>) Cloudinary reduced it to
    ${(newBytes / 1000).toFixed(1)} kB — a reduction of ${diffKB.toFixed(1)} kB or ${percentChange.toFixed(1)}%.<br>
    View the <a href="${optimisedUrl}" target="_blank">Cloudinary optimised image</a>.</p>
  `;

  document.getElementById('textBlock').innerHTML = newText;
  Array.from(document.getElementsByClassName('hidden-class')).forEach((el) => {
    el.classList.remove('hidden-class');
    el.classList.add('show-class');
  });
}

// Auto-load if ?url= present
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const url = urlParams.get('url');
  const input = document.getElementById('url');
  if (input) input.value = url || '';
  if (url && url.trim().length > 0) loadImages();
});

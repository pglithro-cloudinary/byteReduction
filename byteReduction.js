// Utility: fetch JSON data from a URL
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

// Fetch the original image size via GET
async function getOriginalBytes(originUrl, flGetInfoUrl) {
  try {
    const response = await fetch(originUrl, { method: 'GET' });
    if (response.ok) {
      const blob = await response.blob();
      return { bytes: blob.size, method: 'GET' };
    }
  } catch (e) {
    console.warn('Direct GET failed, falling back to fl_getinfo', e);
  }

  // Fallback to fl_getinfo input.bytes if direct GET fails
  return new Promise((resolve) => {
    getJSON(flGetInfoUrl, (err, data) => {
      if (!err && data && data.input && typeof data.input.bytes === 'number') {
        resolve({ bytes: data.input.bytes, method: 'FL_GETINFO' });
      } else {
        resolve({ bytes: NaN, method: 'UNKNOWN' });
      }
    });
  });
}

// Build Cloudinary fetch base URL
function buildCloudinaryBase() {
  return 'https://res.cloudinary.com/patrickg-dev/image/fetch/f_auto/q_auto/';
}

// Keep query encoding consistent
function encodeUrlPreservingQuery(u) {
  const parts = u.split('?');
  if (parts.length === 1) return parts[0];
  return parts[0] + '?' + encodeURIComponent(parts[1]);
}

// Main load function (called by button or ?url=)
async function loadImages() {
  const inputUrl = document.getElementById('url').value.trim();
  if (!inputUrl) return;

  const baseUrl = buildCloudinaryBase();
  const img = encodeUrlPreservingQuery(inputUrl);

  // Info URL for Cloudinary JSON
  const infoUrl =
    baseUrl + 'fl_getinfo/' +
    (inputUrl.split('?')[0] + (inputUrl.includes('?') ? '?' + encodeURIComponent(inputUrl.split('?')[1]) : ''));

  // Fetch info from Cloudinary
  let info;
  try {
    info = await new Promise((res) => getJSON(infoUrl, (e, d) => res(e ? null : d)));
  } catch (_) {
    info = null;
  }

  if (!info || !info.output) {
    alert('Could not fetch Cloudinary info for this URL (CORS or fetch blocked).');
    return;
  }

  // Get original bytes via real GET request
  const originProbe = await getOriginalBytes(inputUrl, infoUrl);
  const orgBytes = Number.isFinite(originProbe.bytes) ? originProbe.bytes : (info.input ? info.input.bytes : NaN);
  const newBytes = info.output.bytes;
  const newFormat = info.output.format;

  if (!Number.isFinite(orgBytes) || !Number.isFinite(newBytes)) {
    alert('Could not determine byte sizes due to CORS/restrictions.');
    return;
  }

  // Calculate reduction
  const diffKB = (orgBytes - newBytes) / 1000;
  const percentChange = (100 * (orgBytes - newBytes) / orgBytes);

  // Build transformation with overlay badge
  let newUrl = baseUrl;
  newUrl += `$percent_!${percentChange.toFixed(1)}!/`;
  newUrl += `$bytes_!${(-diffKB).toFixed(1)}!/`;
  newUrl += "$stickerWidth_300/";
  newUrl += "$img_current/w_1/h_1/f_auto/q_auto/l_text:Open%20sans_320_center:%E2%96%BC,co_green,w_300,ar_1,c_lpad,b_rgb:0C163B,r_max/fl_layer_apply,g_north_east,e_outline:outer,co_rgb:3F5FFF,o_93/l_logo,w_60/fl_layer_apply,g_north,y_24/l_text:Open%20sans_84_center_bold:$(percent)%25,w_340,h_96,c_lpad,co_white/fl_layer_apply,g_north,y_90/l_text:Open%20sans_35_center_bold:REDUCTION,w_340,c_lpad,co_white/fl_layer_apply,g_north,y_176/l_text:Open%20sans_35_center:($(bytes)%20kB),w_340,c_lpad,co_white/fl_layer_apply,g_north,y_208/w_$stickerWidth/u_$img,w_800/fl_layer_apply,";
  newUrl += "north/";

  // Display examples
  document.getElementById('imageBoxS').src = newUrl + "w_400/" + img;
  document.getElementById('imageBoxM').src = newUrl + "w_600/" + img;
  document.getElementById('imageBoxL').src = newUrl + "w_800/" + img;

  // Summary block with Cloudinary link
  const newText = `
    <p>This shows an example of the optimisation possible using Cloudinary.<br>
    The <a href="${inputUrl}" target="_blank">source image</a> was originally
    ${(orgBytes / 1000).toFixed(1)} kB (via <code>${originProbe.method}</code>),
    and after optimisation (<b>${newFormat}</b>) Cloudinary reduced it to
    ${(newBytes / 1000).toFixed(1)} kB — a reduction of ${diffKB.toFixed(1)} kB or ${percentChange.toFixed(1)}%.<br>
    View the <a href="${newUrl + 'w_800/' + img}" target="_blank">Cloudinary version</a>.</p>
  `;

  document.getElementById('textBlock').innerHTML = newText;
  Array.from(document.getElementsByClassName('hidden-class')).forEach((el) => {
    el.classList.remove('hidden-class');
    el.classList.add('show-class');
  });
}

// Auto-load only when ?url= exists
document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const url = urlParams.get('url');
  const input = document.getElementById('url');
  if (input) input.value = url || '';

  // ✅ Only trigger if ?url= present and non-empty
  if (url && url.trim().length > 0) {
    loadImages();
  }
});

const url = 'https://ttkfchhbvjgjymmwprua.supabase.co/rest/v1/';
const apiKey = 'sb_publishable_Gxy3SfS4NLO0wmQoJNkA5g_3NGvBMyd';

fetch(url, {
  headers: {
    'apikey': apiKey,
    'Authorization': `Bearer ${apiKey}`
  }
})
.then(async res => {
  return res.json();
})
.then(data => {
  const invoicesDef = data.definitions.invoices;
  console.log('Invoices Table columns:');
  for (const [col, info] of Object.entries(invoicesDef.properties)) {
    console.log(`- ${col}: type=${info.type}`);
  }
})
.catch(err => {
  console.error('Error:', err);
});

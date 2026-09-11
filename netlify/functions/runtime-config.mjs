import { getStore } from '@netlify/blobs';

export default async () => {
  const store = getStore({ name: 'ktmart-admin', consistency: 'strong' });
  const config = await store.get('current', { type: 'json', consistency: 'strong' }) || {};
  const safe = JSON.stringify(config).replace(/</g, '\\u003c');
  const code = `(function(){
    var c=${safe}; window.KTMART_ADMIN_CONFIG=c||{};
    if(c.site&&window.KTMART)Object.assign(window.KTMART,c.site);
    if(Array.isArray(c.products)&&c.products.length)window.PHONE_PRODUCTS=c.products.filter(function(x){return x&&x.enabled!==false});
    if(Array.isArray(window.KTMART_CAMPAIGN_PRODUCTS)&&window.KTMART_CAMPAIGN_PRODUCTS.length){var campaignIds=window.KTMART_CAMPAIGN_PRODUCTS.map(function(x){return x.id});window.PHONE_PRODUCTS=window.KTMART_CAMPAIGN_PRODUCTS.concat((window.PHONE_PRODUCTS||[]).filter(function(x){return !campaignIds.includes(x.id)}));}
    if(Array.isArray(c.devices)&&c.devices.length)window.DEVICES=c.devices.filter(function(x){return x&&x.enabled!==false});
    if(Array.isArray(c.planGroups)&&c.planGroups.length){
      window.MOBILE_PLAN_GROUPS=c.planGroups;
      if(Array.isArray(window.PLAN_GROUPS)){
        var r={};c.planGroups.forEach(function(g){r[g.id]=g});
        window.PLAN_GROUPS=window.PLAN_GROUPS.map(function(g){var x=r[g.id];return x?{id:x.id,name:x.name,plans:(x.plans||[]).map(function(p){return[p.name,p.price,p.data]})}:g});
        c.planGroups.forEach(function(g){if(!window.PLAN_GROUPS.some(function(x){return x.id===g.id}))window.PLAN_GROUPS.push({id:g.id,name:g.name,plans:(g.plans||[]).map(function(p){return[p.name,p.price,p.data]})})});
      }
    }
  })();`;
  return new Response(code, { status: 200, headers: { 'content-type':'application/javascript; charset=utf-8', 'cache-control':'no-store, max-age=0', 'x-content-type-options':'nosniff' } });
};

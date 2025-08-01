const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  
  const logoElement = page.locator('img[alt="EverJust Logo"]');
  const logoExists = await logoElement.count();
  
  if (logoExists > 0) {
    const logoSrc = await logoElement.getAttribute('src');
    console.log(`✅ Logo source: ${logoSrc}`);
    
    if (logoSrc.includes('everjust_logo_purple3.png?v=3')) {
      console.log(`✅ New purple3 logo is loading!`);
    } else {
      console.log(`❌ Logo source doesn't match expected purple3`);
    }
    
    const box = await logoElement.boundingBox();
    if (box) {
      console.log(`📏 Logo size: ${Math.round(box.width)}x${Math.round(box.height)}px`);
    }
    
    await page.screenshot({ 
      path: 'purple3-logo-test.png',
      clip: { x: 0, y: 0, width: 1200, height: 600 }
    });
    
    console.log(`📸 Screenshot saved as purple3-logo-test.png`);
    
  } else {
    console.log(`❌ Logo not found on page`);
  }
  
  await browser.close();
})();
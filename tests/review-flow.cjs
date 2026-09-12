/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
fs.mkdirSync('artifacts', { recursive: true });
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require('@next/env').loadEnvConfig(process.cwd());
const jwt = require('jsonwebtoken');
(async () => {
 const browser = await chromium.launch({channel:'msedge', headless:true});
 const context = await browser.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true});
 const user={id:'aaaaaaaaaaaaaaaaaaaaaaaa',fullName:'Review Tester',email:'test@example.com',role:'USER',status:'ACTIVE'};
 const token=jwt.sign(user,process.env.JWT_SECRET,{expiresIn:'10m'});
 await context.addCookies([{name:'access_token',value:token,domain:'localhost',path:'/'}]);
 const page = await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const interview={_id:'bbbbbbbbbbbbbbbbbbbbbbbb',applicationId:'cccccccccccccccccccccccc',companyId:'dddddddddddddddddddddddd',scheduledStart:new Date().toISOString(),scheduledEnd:null,type:'ONLINE',status:'SCHEDULED',location:'Ho Chi Minh City',meetingUrl:'',contactName:'',contactEmail:'',contactPhone:'',notes:'',history:[],company:{name:'Example Studio'},application:{_id:'cccccccccccccccccccccccc',position:'Frontend Engineer'}};
 let reviews=[];
 let failReviews=false;
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url());let data=[];
  if (failReviews && url.pathname === '/api/reviews') { await route.fulfill({status:503,json:{success:false,error:'Temporary test failure'}}); return; }
  if(url.pathname==='/api/auth/me') data={user};
  else if(url.pathname==='/api/notifications/upcoming') data={unreadCount:0,today:[],tomorrow:[],thisWeek:[]};
  else if(url.pathname==='/api/interviews') data=[interview];
  else if(url.pathname.startsWith('/api/applications')) data={data:[],total:0};
  else if(url.pathname==='/api/reviews' && req.method()==='POST') { const body=req.postDataJSON();data={...body,_id:'eeeeeeeeeeeeeeeeeeeeeeee',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),company:interview.company,application:interview.application,interview};reviews=[data];interview.status='COMPLETED'; }
  else if(url.pathname.startsWith('/api/reviews/') && req.method()==='PUT') {const body=req.postDataJSON();reviews[0]={...reviews[0],...body};data=reviews[0];}
  else if(url.pathname==='/api/reviews') data=reviews;
  await route.fulfill({json:{success:true,data}});
 });
 await page.goto('http://localhost:3100/scheduler?highlight='+interview._id);
 await page.getByRole('button',{name:'Đã phỏng vấn xong'}).click();
 await page.getByRole('tab',{name:'Kết quả',exact:true}).waitFor();
 await page.getByPlaceholder('Cảm nhận chung, thông tin đội ngũ, văn hóa công ty...').fill('Team tốt, cần hỏi thêm giờ làm.');
 await page.getByPlaceholder('Thêm phúc lợi khác...').fill('Learning budget');
 await page.getByPlaceholder('Thêm phúc lợi khác...').press('Enter');
 await page.getByRole('tab',{name:'Mức lương',exact:true}).click();
 await page.getByPlaceholder('Ví dụ: 18000000').fill('18500000');
 await page.getByPlaceholder('Ví dụ: 17000000').nth(0).fill('19000000');
 await page.getByPlaceholder('Ví dụ: 17000000').nth(1).fill('19500000');
 await page.getByRole('tab',{name:'Ưu / nhược',exact:true}).click();
 await page.getByPlaceholder('Nhập một ưu điểm...').fill('Mentor tốt');
 await page.getByPlaceholder('Nhập một nhược điểm...').fill('Xa nhà');
 await page.screenshot({path:'artifacts/review-mobile.png',fullPage:true});
 await page.getByRole('button',{name:'Lưu & hoàn thành',exact:true}).click();
 await page.getByRole('tab',{name:'Kết quả',exact:true}).waitFor({state:'hidden'});
 assert.deepEqual(reviews[0].advantages,['Mentor tốt']);assert.deepEqual(reviews[0].disadvantages,['Xa nhà']);assert.deepEqual(reviews[0].benefits,['Learning budget']);assert.equal(reviews[0].companyOffer,19500000);
 reviews.push({...reviews[0],_id:'ffffffffffffffffffffffff',company:{name:'Second Studio'},companyOffer:21000000});
 await page.goto('http://localhost:3100/reviews');
 await page.getByRole('button',{name:'Xem / chỉnh sửa đánh giá'}).first().click();
 await page.getByRole('tab',{name:'Mức lương',exact:true}).click();
 assert.equal(await page.getByPlaceholder('Ví dụ: 17000000').nth(1).inputValue(),'19500000');
 await page.getByPlaceholder('Ví dụ: 17000000').nth(1).fill('20500000');
 await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
 await page.getByRole('tab',{name:'Mức lương',exact:true}).waitFor({state:'hidden'});
 assert.equal(reviews[0].companyOffer,20500000);
 await page.getByRole('checkbox').nth(0).check();await page.getByRole('checkbox').nth(1).check();
 await page.getByRole('button',{name:'Compare (2)',exact:true}).click();
 await page.getByText('Company Comparison',{exact:true}).waitFor();
 for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:900});
  await page.screenshot({path:`artifacts/reviews-${width}.png`,fullPage:true});
  const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(size.scroll<=size.width,`Reviews overflow ${width}: ${JSON.stringify(size)}`);
 }
 await page.getByRole('button',{name:'Đóng so sánh'}).click();
 for (const path of ['/scheduler', '/applications', '/profile', '/settings']) {
  for (const width of [320,390,768,1440]) {
   await page.setViewportSize({width,height:900});
   await page.goto('http://localhost:3100'+path);
   await page.locator('h1').waitFor();
   const size=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   if (size.scroll > size.width) {
    await page.screenshot({path:'artifacts/overflow.png',fullPage:true});
    console.log(await page.evaluate(() => [...document.querySelectorAll('main *')].filter(e => e.getBoundingClientRect().right > innerWidth).slice(0,15).map(e => ({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,100)}))));
   }
   assert.ok(size.scroll<=size.width,`${path} overflow ${width}: ${JSON.stringify(size)}`);
  }
 }
 await page.setViewportSize({width:320,height:740});
 await page.goto('http://localhost:3100/scheduler?highlight='+interview._id);
 await page.getByRole('button',{name:'Xem / bổ sung đánh giá'}).click();
 await page.getByRole('tab',{name:'Kết quả',exact:true}).waitFor();
 assert.equal(await page.getByPlaceholder('Cảm nhận chung, thông tin đội ngũ, văn hóa công ty...').inputValue(),'Team tốt, cần hỏi thêm giờ làm.');
 await page.getByRole('button',{name:'Hủy',exact:true}).click();
 failReviews=true;
 await page.goto('http://localhost:3100/reviews');
 await page.getByText('Temporary test failure',{exact:true}).waitFor();
 failReviews=false;
 await page.getByRole('button',{name:'Thử lại',exact:true}).click();
 await page.getByRole('button',{name:'Xem / chỉnh sửa đánh giá'}).first().waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS: complete → save notes/salary/pros/cons/custom benefit → edit → compare; no page errors; responsive 320/390/768/1440');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

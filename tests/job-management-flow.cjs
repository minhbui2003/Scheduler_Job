/* eslint-disable @typescript-eslint/no-require-imports */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict');
require('@next/env').loadEnvConfig(process.cwd());
(async()=>{
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const user={id:'aaaaaaaaaaaaaaaaaaaaaaaa',role:'USER',status:'ACTIVE',fullName:'Job Test',email:'test@example.com'};
await page.context().addCookies([{name:'access_token',value:require('jsonwebtoken').sign(user,process.env.JWT_SECRET,{expiresIn:'10m'}),domain:'localhost',path:'/'}]);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let interview={_id:'cccccccccccccccccccccccc',applicationId:'bbbbbbbbbbbbbbbbbbbbbbbb',companyId:'dddddddddddddddddddddddd',scheduledStart:new Date().toISOString(),scheduledEnd:null,type:'OFFLINE',location:'Office',meetingUrl:'',contactName:'HR',contactEmail:'hr@example.com',contactPhone:'',status:'SCHEDULED',notes:'',history:[],company:{name:'Test Company'}};
let job={_id:interview.applicationId,companyId:interview.companyId,position:'Developer',status:'INTERVIEW_SCHEDULED',applicationDate:new Date().toISOString(),createdAt:new Date().toISOString(),notes:'Job notes',jdText:'Keep JD text',jdFileUrl:'data:application/pdf;base64,JVBERg==',jdOriginalFilename:'wrong.pdf',company:interview.company};
let failDelete=false;
await page.route('**/api/**',async route=>{
const req=route.request(),url=new URL(req.url());let data=[];
if(url.pathname==='/api/auth/me') data={user};
else if(url.pathname==='/api/notifications/upcoming') data={unreadCount:0};
else if(url.pathname==='/api/interviews') data=interview?[{...interview,application:job,company:job.company}]:[];
else if(url.pathname.startsWith('/api/interviews/') && req.method()==='PUT') {interview={...interview,...req.postDataJSON()};data=interview;}
else if(url.pathname.startsWith('/api/interviews/') && req.method()==='DELETE') {interview=null;data={};}
else if(url.pathname==='/api/applications') data={data:job?[job]:[],total:job?1:0};
else if(url.pathname.startsWith('/api/applications/')) {
 if(req.method()==='PUT') {const patch=req.postDataJSON();job={...job,...patch};if(patch.companyName)job.company={name:patch.companyName};data=job;}
 else if(req.method()==='DELETE') {
  if(failDelete) {await route.fulfill({status:500,json:{success:false,error:'Không thể xóa công việc.'}});return;}
  job=null;interview=null;data={};
 } else data={...job,interviews:interview?[interview]:[]};
}
await route.fulfill({json:{success:true,data}});
});
const openSheet=async()=>{await page.goto('http://localhost:3100/scheduler?highlight=cccccccccccccccccccccccc');await page.getByRole('button',{name:'Sửa / xóa công việc',exact:true}).waitFor();};
await openSheet();
await page.getByRole('button',{name:'Xóa file JD',exact:true}).click();
await page.getByRole('button',{name:'Giữ lại',exact:true}).click();assert.ok(job.jdFileUrl);
await page.getByRole('button',{name:'Xóa file JD',exact:true}).click();
await page.getByRole('button',{name:'Xác nhận xóa',exact:true}).click();
await page.getByRole('button',{name:'Xóa file JD',exact:true}).waitFor({state:'hidden'});
assert.equal(job.jdFileUrl,'');assert.equal(job.jdOriginalFilename,'');assert.equal(job.jdText,'Keep JD text');
await page.getByRole('button',{name:'Sửa',exact:true}).click();
await page.locator('input[type=file]').setInputFiles({name:'wrong.txt',mimeType:'text/plain',buffer:Buffer.from('File text')});
await page.getByText('Đã chọn: wrong.txt',{exact:true}).waitFor();
await page.getByRole('button',{name:'Gỡ file đã chọn',exact:true}).click();
await page.getByRole('button',{name:'Lưu JD',exact:true}).click();
await page.getByRole('button',{name:'Lưu JD',exact:true}).waitFor({state:'hidden'});
assert.equal(job.jdFileUrl,'');assert.equal(job.jdText,'File text');
await openSheet();
await page.getByRole('button',{name:'Sửa thông tin phỏng vấn',exact:true}).click();
await page.getByLabel('Tên người liên hệ',{exact:true}).fill('New HR');
await page.getByLabel('Địa điểm phỏng vấn',{exact:true}).fill('New office');
await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
await page.getByLabel('Tên người liên hệ',{exact:true}).waitFor({state:'hidden'});
assert.equal(interview.contactName,'New HR');assert.equal(interview.location,'New office');
await page.goto('http://localhost:3100/applications');
await page.getByRole('button',{name:'Chi tiết',exact:true}).click();
await page.getByLabel('Vị trí ứng tuyển',{exact:true}).fill('Senior Developer');
await page.getByLabel('Tên công ty',{exact:true}).fill('Correct Company');
await page.getByLabel('Ghi chú về công việc',{exact:true}).fill('Updated job notes');
for(const width of [320,390,1440]) {await page.setViewportSize({width,height:900}); const dims=await page.evaluate(()=>[document.documentElement.scrollWidth,innerWidth]);assert.ok(dims[0]<=dims[1]);}
await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();
await page.getByLabel('Vị trí ứng tuyển',{exact:true}).waitFor({state:'hidden'});
assert.equal(job.position,'Senior Developer');assert.equal(job.company.name,'Correct Company');assert.equal(job.notes,'Updated job notes');
await openSheet();await page.getByRole('button',{name:'Xóa lịch phỏng vấn',exact:true}).click();
await page.getByRole('button',{name:'Xác nhận xóa',exact:true}).click();
await page.getByRole('button',{name:'Xác nhận xóa',exact:true}).waitFor({state:'hidden'});
assert.equal(interview,null);assert.ok(job);
await page.goto('http://localhost:3100/applications');
await page.getByRole('button',{name:'Chi tiết',exact:true}).click();
await page.getByRole('button',{name:'Xóa công việc',exact:true}).click();
failDelete=true;
await page.getByRole('button',{name:'Xác nhận xóa',exact:true}).click();
await page.getByText('Không thể xóa công việc.',{exact:true}).waitFor();
assert.ok(job);failDelete=false;
await page.getByRole('button',{name:'Xác nhận xóa',exact:true}).click();
await page.getByRole('button',{name:'Xác nhận xóa',exact:true}).waitFor({state:'hidden'});
assert.equal(job,null);assert.deepEqual(errors,[]);
console.log('PASS: remove JD/cancel; upload then remove; edit HR/job/company; delete interview retains job; failed job deletion can retry; mobile/desktop fit. Mock APIs only.');
await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

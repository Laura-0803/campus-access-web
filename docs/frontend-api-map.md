# 前端 API 对照

路径相对于应用目录。全部封装逐项对应 api-inventory.csv；未消费不代表允许删除。

|封装|方法|路径模板|调用点|
|---|---|---|---|
|login|POST|`/auth/login`|src/pages/LoginPage.jsx:131|
|logout|POST|`/auth/logout`|src/App.jsx:134|
|sendVisitorCode|POST|`/auth/send-code`|src/pages/LoginPage.jsx:168|
|sendResetCode|POST|`/auth/reset-code`|src/pages/LoginPage.jsx:191|
|resetPassword|POST|`/auth/reset-password`|src/pages/LoginPage.jsx:241|
|registerVisitor|POST|`/auth/register-visitor`|src/pages/LoginPage.jsx:304|
|me|GET|`/auth/me`|未发现调用|
|changePassword|PATCH|`/auth/password`|src/pages/FeaturePages.jsx:333|
|roles|GET|`/roles`|未发现调用|
|adminDashboard|GET|`/dashboard/admin`|src/pages/AdminDashboard.jsx:68|
|roleDashboard|GET|`/dashboard/:role`|src/components/layout/SideBar.jsx:38<br>src/pages/FeaturePages.jsx:381<br>src/pages/FeaturePages.jsx:938<br>src/pages/FeaturePages.jsx:1012<br>src/pages/FeaturePages.jsx:2067<br>src/pages/RoleDashboard.jsx:27|
|appointments|GET|`/appointments`|src/pages/FeaturePages.jsx:817|
|appointmentHosts|GET|`/appointments/hosts`|src/pages/RoleDashboard.jsx:238|
|createAppointment|POST|`/appointments`|src/pages/RoleDashboard.jsx:296|
|reviewAppointment|PATCH|`/appointments/:id/review`|src/pages/FeaturePages.jsx:853|
|accessRecords|GET|`/access-records`|src/pages/FeaturePages.jsx:937<br>src/pages/FeaturePages.jsx:1409|
|createAccessRecord|POST|`/access-records`|src/pages/FeaturePages.jsx:1309|
|simulateScan|POST|`/access-records/simulate`|src/pages/FeaturePages.jsx:1487|
|exceptions|GET|`/exceptions`|src/components/layout/SideBar.jsx:37<br>src/pages/FeaturePages.jsx:1011<br>src/pages/FeaturePages.jsx:1244|
|exceptionAnalysis|GET|`/exceptions/analysis`|src/pages/FeaturePages.jsx:1016|
|exceptionChat|POST|`/exceptions/chat`|src/pages/FeaturePages.jsx:1787|
|analyzeException|GET|`/exceptions/:id/analysis`|未发现调用|
|updateException|PATCH|`/exceptions/:id`|未发现调用|
|handleException|POST|`/exceptions/:id/actions`|src/pages/FeaturePages.jsx:1065<br>src/pages/FeaturePages.jsx:1271<br>src/pages/FeaturePages.jsx:1317|
|devices|GET|`/devices`|src/pages/FeaturePages.jsx:1889|
|createDevice|POST|`/devices`|src/pages/FeaturePages.jsx:1930|
|updateDevice|PATCH|`/devices/:id`|src/pages/FeaturePages.jsx:1927|
|deleteDevice|DELETE|`/devices/:id`|src/pages/FeaturePages.jsx:1957|
|profile|GET|`/profiles/:role`|未发现调用|
|myProfile|GET|`/profiles/me`|src/pages/FeaturePages.jsx:298|
|updateMyProfile|PATCH|`/profiles/me`|src/pages/FeaturePages.jsx:320|
|faces|GET|`/faces`|未发现调用|
|uploadFace|POST|`/faces/upload`|src/pages/FeaturePages.jsx:414|
|vehicles|GET|`/vehicles`|src/pages/FeaturePages.jsx:506<br>src/pages/FeaturePages.jsx:616|
|createVehicle|POST|`/vehicles`|src/pages/FeaturePages.jsx:534<br>src/pages/FeaturePages.jsx:668|
|updateVehicle|PATCH|`/vehicles/:id`|src/pages/FeaturePages.jsx:531<br>src/pages/FeaturePages.jsx:665<br>src/pages/FeaturePages.jsx:683|
|deleteVehicle|DELETE|`/vehicles/:id`|src/pages/FeaturePages.jsx:554<br>src/pages/FeaturePages.jsx:702|
|qrCodes|GET|`/qr-codes`|src/pages/FeaturePages.jsx:1410|
|createQrCode|POST|`/qr-codes`|src/pages/FeaturePages.jsx:2102<br>src/pages/RoleDashboard.jsx:168|
|verifyQrCode|POST|`/qr-codes/:id/verify`|未发现调用|
|reportSummary|GET|`/reports/summary`|src/pages/FeaturePages.jsx:2175|
|people|GET|`/people`|src/pages/FeaturePages.jsx:617<br>src/pages/FeaturePages.jsx:2245<br>src/pages/FeaturePages.jsx:2335|
|createPerson|POST|`/people`|src/pages/FeaturePages.jsx:2536|
|updatePerson|PATCH|`/people/:id`|src/pages/FeaturePages.jsx:2512<br>src/pages/FeaturePages.jsx:2583|
|deletePerson|DELETE|`/people/:id`|src/pages/FeaturePages.jsx:2595|
|users|GET|`/users`|src/pages/FeaturePages.jsx:2244<br>src/pages/FeaturePages.jsx:2336|
|createUser|POST|`/users`|src/pages/FeaturePages.jsx:2259<br>src/pages/FeaturePages.jsx:2524<br>src/pages/FeaturePages.jsx:2537|
|updateUser|PATCH|`/users/:id`|src/pages/FeaturePages.jsx:2273<br>src/pages/FeaturePages.jsx:2282<br>src/pages/FeaturePages.jsx:2522|
|messages|GET|`/messages`|src/components/layout/AnnouncementBar.jsx:38<br>src/pages/FeaturePages.jsx:3096|
|createMessage|POST|`/messages`|src/pages/FeaturePages.jsx:3169|
|updateMessage|PATCH|`/messages/:id`|src/pages/FeaturePages.jsx:3167|
|deleteMessage|DELETE|`/messages/:id`|src/pages/FeaturePages.jsx:3188|
|markMessageRead|PATCH|`/messages/:id/read`|未发现调用|
|gates|GET|`/gates`|src/pages/FeaturePages.jsx:2775|
|updateGate|PATCH|`/gates/:id`|src/pages/FeaturePages.jsx:2894|
|accessRules|GET|`/access-rules`|src/pages/FeaturePages.jsx:2774|
|validateAccessRule|POST|`/access-rules/validate`|src/pages/FeaturePages.jsx:2843|
|updateAccessRule|PATCH|`/access-rules/:id`|src/pages/FeaturePages.jsx:2874<br>src/pages/FeaturePages.jsx:2886|
|blacklist|GET|`/blacklist`|src/pages/FeaturePages.jsx:2971|
|createBlacklist|POST|`/blacklist`|src/pages/FeaturePages.jsx:2996|
|updateBlacklist|PATCH|`/blacklist/:id`|src/pages/FeaturePages.jsx:3019|
|logs|GET|`/logs`|src/pages/FeaturePages.jsx:3076|

## 页面路由

```jsx
<Route element={<ProtectedLayout session={session} onLogout={handleLogout} apiError={apiError} />}>
<Route path="/" element={<HomeRedirect session={session} />} />
<Route path="/student" element={<RoleGate session={session} roles={["student"]}><StudentDashboard session={session} /></RoleGate>} />
<Route path="/teacher" element={<RoleGate session={session} roles={["teacher"]}><TeacherDashboard session={session} /></RoleGate>} />
<Route path="/visitor" element={<RoleGate session={session} roles={["visitor"]}><VisitorDashboard session={session} /></RoleGate>} />
<Route path="/alumni" element={<RoleGate session={session} roles={["alumni"]}><AlumniDashboard session={session} /></RoleGate>} />
<Route path="/guard" element={<RoleGate session={session} roles={["guard"]}><GuardDashboard session={session} /></RoleGate>} />
<Route path="/admin" element={<RoleGate session={session} roles={["admin"]}><AdminDashboard session={session} /></RoleGate>} />
<Route path="/profile" element={<ProfilePage session={session} onSessionChange={setSession} />} />
<Route path="/face" element={<RoleGate session={session} roles={["student", "teacher"]}><FaceUploadPage session={session} /></RoleGate>} />
<Route path="/vehicle" element={<RoleGate session={session} roles={["teacher"]}><VehiclePage session={session} /></RoleGate>} />
<Route path="/review" element={<RoleGate session={session} roles={["student", "teacher"]}><AppointmentReviewPage session={session} mode="review" /></RoleGate>} />
<Route path="/appointments" element={<RoleGate session={session} roles={["admin"]}><AppointmentReviewPage session={session} mode="manage" /></RoleGate>} />
<Route path="/appointment-status" element={<RoleGate session={session} roles={["visitor"]}><AppointmentStatusPage session={session} /></RoleGate>} />
<Route path="/visitor-qr" element={<RoleGate session={session} roles={["visitor"]}><QRPage session={session} type="visitor" /></RoleGate>} />
<Route path="/alumni-qr" element={<RoleGate session={session} roles={["alumni"]}><QRPage session={session} type="alumni" /></RoleGate>} />
<Route path="/monitor" element={<RoleGate session={session} roles={["guard", "admin"]}><MonitorPage session={session} /></RoleGate>} />
<Route path="/identity-check" element={<RoleGate session={session} roles={["guard"]}><IdentityCheckPage session={session} /></RoleGate>} />
<Route path="/records" element={<MonitorPage session={session} />} />
<Route path="/exceptions" element={<RoleGate session={session} roles={["student", "teacher", "visitor", "alumni", "admin"]}><ExceptionCenterPage session={session} /></RoleGate>} />
<Route path="/devices" element={<RoleGate session={session} roles={["guard", "admin"]}><DevicesPage session={session} /></RoleGate>} />
<Route path="/reports" element={<RoleGate session={session} roles={["admin"]}><ReportsPage session={session} /></RoleGate>} />
<Route path="/people" element={<RoleGate session={session} roles={["admin"]}><PeopleManagementPage session={session} /></RoleGate>} />
<Route path="/vehicles" element={<RoleGate session={session} roles={["admin"]}><VehiclePage session={session} /></RoleGate>} />
<Route path="/rules" element={<RoleGate session={session} roles={["admin"]}><RulesPage session={session} /></RoleGate>} />
<Route path="/blacklist" element={<RoleGate session={session} roles={["admin"]}><BlacklistPage session={session} /></RoleGate>} />
<Route path="/announcements" element={<RoleGate session={session} roles={["admin"]}><AnnouncementPage session={session} /></RoleGate>} />
<Route path="/logs" element={<RoleGate session={session} roles={["admin"]}><LogsPage session={session} /></RoleGate>} />
<Route path="*" element={<HomeRedirect session={session} />} />
```

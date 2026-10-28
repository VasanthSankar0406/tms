# TODO: Add Edit and Delete Actions to Route View

## Tasks
- [x] Add state variables for edit modal and selected route
- [x] Create edit modal component with form fields
- [x] Implement handleEdit function to open modal with route data
- [x] Implement handleUpdate function to call update API
- [x] Implement handleDelete function with confirmation dialog
- [x] Update table Actions column to include Edit and Delete buttons
- [x] Add refresh functionality after successful operations
- [ ] Test edit and delete functionality
- [x] Change route name filter from text input to dropdown
- [x] Add route ID field to edit modal (editable text input)

# TODO: Fix Hardcoded localhost URLs in Frontend

## Overview
Replace all hardcoded "http://localhost:5000" URLs in frontend files with dynamic `${API_URL}` from config.js to ensure the app works when deployed on different hosts.

## Files to Update
- [x] LeaveRequest.js - Import API_URL and replace all localhost URLs
- [x] Home.js - Import API_URL and replace all localhost URLs
- [x] EditDriverProfile.js - Import API_URL and replace all localhost URLs
- [x] StudentAttendance.js - Import API_URL and replace all localhost URLs
- [x] ViewVehicle.js
- [x] ViewPermit.js
- [x] AddPermit.js
- [x] ViewFC.js
- [x] ViewInsurance.js
- [x] AddInsurance.js
- [x] AddFC.js
- [x] AddVehicle.js
- [x] ViewStage.js
- [x] ViewTraveller.js
- [x] AddStage.js
- [x] AddTraveller.js
- [x] AddRoute.js
- [x] ViewRoute.js
- [x] ViewCost.js

## Testing
- Test login functionality after changes
- Verify app works on different hosts
- Check for any remaining hardcoded URLs

## Progress
- ALL frontend files have been standardized with `${API_URL}` from config.js.

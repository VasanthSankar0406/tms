import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Frontend/pages/Login";
import ViewStage from "./Frontend/pages/StageMaster/ViewStage";
import ViewRoute from "./Frontend/pages/RouteMaster/ViewRoute";
import ViewDriver from "./Frontend/pages/DriverAllotment/ViewDriver";
import AddTraveller from "./Frontend/pages/TravellerAllotment/AddTraveller";
import ViewTraveller from "./Frontend/pages/TravellerAllotment/ViewTraveller";
import ViewVehicle from "./Frontend/pages/VehicleMaster/ViewVehicle";
import ViewPermit from "./Frontend/pages/VehicleMaster/PermitDetails/ViewPermit";
import ViewInsurance from "./Frontend/pages/VehicleMaster/InsuranceDetails/ViewInsurance";
import ViewFC from "./Frontend/pages/VehicleMaster/FCDetails/ViewFC";
import ViewCost from "./Frontend/pages/CostMaster/ViewCost";
import Home from "./Frontend/pages/Home";
import DriverProfile from "./Frontend/pages/DriverProfile";
import Dashboard from "./Frontend/pages/Dashboard";
import DriverDashboard from "./Frontend/pages/DriverDashboard";
import EditDriverProfile from "./Frontend/pages/EditDriverProfile";
import LeaveRequest from "./Frontend/pages/LeaveRequest";
import DriverQuery from "./Frontend/pages/DriverAllotment/DriverQuery";
import BusLocation from "./Frontend/pages/BusLocation";
import DriverAttendance from "./Frontend/pages/DriverAttendance";
import StudentAttendance from "./Frontend/pages/StudentAttendance";
import DriverApp from "./Frontend/pages/DriverApp";
import BusStudentLookup from "./Frontend/pages/BusStudentLookup";
import MaintenanceManagement from "./Frontend/pages/MaintenanceManagement";
import CapacityManagement from "./Frontend/pages/CapacityManagement";
import BreakdownReplacement from "./Frontend/pages/BreakdownReplacement";
import ComplaintManagement from "./Frontend/pages/ComplaintManagement";
import CentralizedDashboard from "./Frontend/pages/CentralizedDashboard";
import BusFeesManagement from "./Frontend/pages/BusFeesManagement";
import BusPendingFeesList from "./Frontend/pages/BusPendingFeesList";
import BusSeatingAllocation from "./Frontend/pages/BusSeatingAllocation";
import BusWashingSchedule from "./Frontend/pages/BusWashingSchedule";
import BackgroundSlideshow from "./Frontend/components/BackgroundSlideshow";

const App = () => {
  return (
    <Router>
      <BackgroundSlideshow />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/driver-dashboard" element={<DriverDashboard />} />
        <Route path="/driver-profile" element={<DriverProfile />} />
        <Route path="/edit-driver-profile" element={<EditDriverProfile />} />
        <Route path="/driver-attendance" element={<DriverAttendance />} />
        <Route path="/leave-request" element={<LeaveRequest />} />
        <Route path="/driver-query" element={<DriverQuery />} />
        <Route path="/driver-app" element={<DriverApp />} />

        {/* Direct routes */}
        <Route path="/bus-fees" element={<BusFeesManagement />} />
        <Route path="/bus-pending-fees" element={<BusPendingFeesList />} />
        <Route path="/bus-seating" element={<BusSeatingAllocation />} />
        <Route path="/bus-washing" element={<BusWashingSchedule />} />

        {/* The Home route wrapper */}
        <Route path="/home" element={<Home />}>
          <Route path="viewtraveller" element={<ViewTraveller />} />
          <Route path="addtraveller" element={<AddTraveller />} />
          <Route path="viewdriver" element={<ViewDriver />} />
          <Route path="adddriver" element={<ViewDriver initialOpenAdd={true} />} />
          <Route path="leave-request" element={<LeaveRequest />} />
          <Route path="driver-query" element={<DriverQuery />} />
          {/* Unified Route Master routes */}
          <Route path="routemaster" element={<ViewRoute />} />
          <Route path="viewroute" element={<ViewRoute />} />
          <Route path="addroute" element={<ViewRoute />} />
          {/* Unified Stage Master routes */}
          <Route path="stagemaster" element={<ViewStage />} />
          <Route path="viewstage" element={<ViewStage />} />
          <Route path="addstage" element={<ViewStage />} />
          <Route path="student-attendance" element={<StudentAttendance />} />
          <Route path="cost" element={<ViewCost />} />
          <Route path="costmaster" element={<ViewCost />} />
          <Route path="cost-details" element={<ViewCost />} />

          {/* Bus Fees & Defaulters */}
          <Route path="bus-fees" element={<BusFeesManagement />} />
          <Route path="bus-pending-fees" element={<BusPendingFeesList />} />

          {/* Bus Seating Allocation */}
          <Route path="bus-seating" element={<BusSeatingAllocation />} />

          {/* Bus Washing Schedule */}
          <Route path="bus-washing" element={<BusWashingSchedule />} />

          {/* Unified Vehicle Master routes */}
          <Route path="vehiclemaster" element={<ViewVehicle />} />
          <Route path="vehiclemaster/viewvehicle" element={<ViewVehicle />} />
          <Route path="vehiclemaster/addvehicle" element={<ViewVehicle />} />
          {/* Unified Permit Master routes */}
          <Route path="vehiclemaster/permitmaster" element={<ViewPermit />} />
          <Route path="vehiclemaster/viewpermit" element={<ViewPermit />} />
          <Route path="vehiclemaster/addpermit" element={<ViewPermit />} />
          {/* Unified Insurance Master routes */}
          <Route path="vehiclemaster/insurancemaster" element={<ViewInsurance />} />
          <Route path="vehiclemaster/viewinsurance" element={<ViewInsurance />} />
          <Route path="vehiclemaster/addinsurance" element={<ViewInsurance />} />
          {/* Unified Fitness Certificate Master routes */}
          <Route path="vehiclemaster/fcmaster" element={<ViewFC />} />
          <Route path="vehiclemaster/viewfc" element={<ViewFC />} />
          <Route path="vehiclemaster/addfc" element={<ViewFC />} />
          <Route path="buslocation" element={<BusLocation />} />
          <Route path="bus-lookup" element={<BusStudentLookup />} />
          <Route path="maintenance" element={<MaintenanceManagement />} />
          <Route path="capacity" element={<CapacityManagement />} />
          <Route path="breakdown" element={<BreakdownReplacement />} />
          <Route path="complaints" element={<ComplaintManagement />} />
          <Route path="centralized-dashboard" element={<CentralizedDashboard />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;

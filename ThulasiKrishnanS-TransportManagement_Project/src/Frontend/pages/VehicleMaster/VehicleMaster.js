import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import "../../styles/VehicleMaster.css";

const VehicleMaster = () => {
  return (
    <div className="vehicle-master-container">
      <div className="vehicle-options-container">
        <h2 className="vehicle-title">Vehicle Master</h2>
        <div className="vehicle-options">
          <NavLink className={({ isActive }) => isActive ? "active" : ""} to="viewvehicle">View</NavLink>
          <NavLink className={({ isActive }) => isActive ? "active" : ""} to="addvehicle">Add</NavLink>
          <NavLink className={({ isActive }) => isActive ? "active" : ""} to="addpermit">Vehicle Permit Form</NavLink>
          <NavLink className={({ isActive }) => isActive ? "active" : ""} to="addinsurance">Insurance Details</NavLink>
          <NavLink className={({ isActive }) => isActive ? "active" : ""} to="addfc">FC Details</NavLink>
        </div>
      </div>
      
      <div className="vehicle-content">
        <Outlet />
      </div>
    </div>
  );
};

export default VehicleMaster;

import React from "react";
import ViewTraveller from "./ViewTraveller";

/**
 * AddTraveller page component.
 * Integrates into the unified single-page Traveller Management workflow
 * by rendering ViewTraveller with the Add Traveller modal automatically opened.
 */
const AddTraveller = () => {
  return <ViewTraveller initialOpenAdd={true} />;
};

export default AddTraveller;

import React from "react";
import ViewDriver from "./ViewDriver";

/**
 * AddDriver wraps ViewDriver with the Add Driver modal automatically open,
 * ensuring no separate page is displayed while maintaining full backward-compatibility.
 */
const AddDriver = () => {
  return <ViewDriver initialOpenAdd={true} />;
};

export default AddDriver;

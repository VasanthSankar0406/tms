import * as XLSX from "xlsx";
import jsPDF from "jspdf";

export const exportToExcel = (data, filename = "Report") => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportDriverToPDF = (driver) => {
  const doc = new jsPDF();

  // Add header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("K.R. Nagar, Kovilpatti - 628503, Thoothukudi Dist. Tamilnadu", 105, 30, { align: "center" });
  doc.text("Phone: 04632 - 222502, 230227 | Email: principal@nec.edu.in", 105, 40, { align: "center" });

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Driver Information Report", 105, 60, { align: "center" });

  // Driver details
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  let yPosition = 80;

  const addText = (label, value) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 20, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(value || "N/A", 80, yPosition);
    yPosition += 10;
  };

  addText("Staff Code", driver.staffcode);
  addText("Staff Name", driver.staffname);
  addText("Vehicle ID", driver.vehicleid);
  addText("Route Name", driver.routename);
  addText("Door No", driver.doorno);
  addText("Street Name", driver.streetname);
  addText("City", driver.city);
  addText("State", driver.state);
  addText("Pincode", driver.pincode);
  addText("Mobile No", driver.mobileno);

  // Add footer
  doc.setFontSize(10);
  doc.setFont("helvetica", "italic");
  doc.text("Generated on: " + new Date().toLocaleDateString(), 20, 280);
  doc.text("Transport Management System", 20, 290);

  // Save the PDF
  doc.save(`Driver_${driver.staffcode}_Report.pdf`);
};

export const exportRouteToPDF = (routeData) => {
  const doc = new jsPDF();

  // Add header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Transport Management System", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("K.R. Nagar, Kovilpatti - 628503, Thoothukudi Dist. Tamilnadu", 105, 30, { align: "center" });
  doc.text("Phone: 04632 - 222502, 230227 | Email: principal@nec.edu.in", 105, 40, { align: "center" });

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Route Details Report", 105, 60, { align: "center" });

  let yPosition = 80;

  // Route Information
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Route Information", 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");

  const addText = (label, value) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, 20, yPosition);
    doc.setFont("helvetica", "normal");
    doc.text(String(value || "N/A"), 80, yPosition);
    yPosition += 8;
  };

  addText("Route ID", routeData.routeid);
  addText("Route Name", routeData.routename);
  addText("City", routeData.city);
  addText("Total Stages", routeData.totalstages);
  addText("Total Distance (km)", routeData.totaldistance);
  yPosition += 5;

  // Vehicles and Drivers
  if (routeData.vehicles && routeData.vehicles.length > 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Vehicles & Drivers", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    routeData.vehicles.forEach((vehicle, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`Vehicle ${index + 1}:`, 20, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "normal");
      addText("Bus ID", vehicle.vehicleid);
      addText("Vehicle Type", vehicle.vehicletype);
      addText("Seat Capacity", vehicle.seatcapacity);
      addText("Registration No", vehicle.registrationno);
      addText("Registration Date", vehicle.registrationdate ? new Date(vehicle.registrationdate).toLocaleDateString() : "N/A");
      addText("Purchase Date", vehicle.purchasedate ? new Date(vehicle.purchasedate).toLocaleDateString() : "N/A");
      addText("Vendor ID", vehicle.vendorid);
      addText("RC No", vehicle.rcno);
      addText("Registration Place", vehicle.registrationplace);

      if (vehicle.driver) {
        doc.setFont("helvetica", "bold");
        doc.text("Driver Details:", 30, yPosition);
        yPosition += 8;

        doc.setFont("helvetica", "normal");
        addText("Staff Code", vehicle.driver.staffcode);
        addText("Driver Name", vehicle.driver.staffname);
        addText("Door No", vehicle.driver.doorno);
        addText("Street Name", vehicle.driver.streetname);
        addText("City", vehicle.driver.city);
        addText("State", vehicle.driver.state);
        addText("Pincode", vehicle.driver.pincode);
        addText("Mobile No", vehicle.driver.mobileno);
      } else {
        doc.setFont("helvetica", "italic");
        doc.text("No driver assigned", 30, yPosition);
        yPosition += 8;
      }
      yPosition += 5;
    });
  }

  // Stages
  if (routeData.stages && routeData.stages.length > 0) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Route Stages", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    routeData.stages.forEach((stage, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`Stage ${index + 1}:`, 20, yPosition);
      yPosition += 8;

      doc.setFont("helvetica", "normal");
      addText("Stage ID", stage.stageid);
      addText("Stage Name", stage.stagename);
      addText("City", stage.city);
      addText("Arrival Time", stage.arrivaltime || "N/A");
      addText("Departure Time", stage.departuretime || "N/A");
      addText("Fee", stage.fee ? `₹${stage.fee}` : "N/A");
      yPosition += 5;
    });
  }

  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 20);
    doc.text("Transport Management System", 20, doc.internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
  }

  // Save the PDF
  doc.save(`Route_${routeData.routeid}_Details.pdf`);
};

export const exportStudentAttendanceToPDF = (attendanceData, startDate, endDate) => {
  const doc = new jsPDF();

  // Add header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("National Engineering College", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("K.R. Nagar, Kovilpatti - 628503, Thoothukudi Dist. Tamilnadu", 105, 30, { align: "center" });
  doc.text("Phone: 04632 - 222502, 230227 | Email: principal@nec.edu.in", 105, 40, { align: "center" });

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Student Attendance Report", 105, 60, { align: "center" });

  // Date range
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  let dateRangeText = "All Dates";
  if (startDate && endDate) {
    dateRangeText = `From ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`;
  }
  doc.text(`Date Range: ${dateRangeText}`, 105, 70, { align: "center" });

  let yPosition = 85;

  if (!attendanceData || attendanceData.length === 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "italic");
    doc.text("No attendance data available for the selected period.", 105, yPosition, { align: "center" });
  } else {
    // Table headers
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");

    const headers = ["Vehicle ID", "Reg. No", "Route Name", "Date", "Student Count", "Driver Name", "Submitted At"];
    const columnWidths = [25, 30, 35, 25, 25, 35, 35];
    let xPosition = 10;

    headers.forEach((header, index) => {
      doc.text(header, xPosition, yPosition);
      xPosition += columnWidths[index];
    });

    yPosition += 5;
    doc.line(10, yPosition, 200, yPosition); // Horizontal line
    yPosition += 5;

    // Table data
    doc.setFont("helvetica", "normal");

    attendanceData.forEach((record, index) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;

        // Repeat headers on new page
        doc.setFont("helvetica", "bold");
        xPosition = 10;
        headers.forEach((header, idx) => {
          doc.text(header, xPosition, yPosition);
          xPosition += columnWidths[idx];
        });
        yPosition += 5;
        doc.line(10, yPosition, 200, yPosition);
        yPosition += 5;
        doc.setFont("helvetica", "normal");
      }

      xPosition = 10;
      const values = [
        record.vehicleid?.toString() || "",
        record.registrationno || "",
        record.routename || "",
        new Date(record.attendance_date).toLocaleDateString(),
        record.student_count?.toString() || "",
        record.driver_name || "",
        new Date(record.timestamp).toLocaleString()
      ];

      values.forEach((value, idx) => {
        const maxWidth = columnWidths[idx] - 2;
        const truncatedValue = value.length > 15 ? value.substring(0, 12) + "..." : value;
        doc.text(truncatedValue, xPosition, yPosition);
        xPosition += columnWidths[idx];
      });

      yPosition += 8;
    });

    // Summary
    yPosition += 10;
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Summary:", 10, yPosition);
    yPosition += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const totalRecords = attendanceData.length;
    const totalStudents = attendanceData.reduce((sum, record) => sum + (record.student_count || 0), 0);
    const avgStudents = totalRecords > 0 ? (totalStudents / totalRecords).toFixed(2) : 0;

    doc.text(`Total Records: ${totalRecords}`, 10, yPosition);
    yPosition += 6;
    doc.text(`Total Students Counted: ${totalStudents}`, 10, yPosition);
    yPosition += 6;
    doc.text(`Average Students per Record: ${avgStudents}`, 10, yPosition);
  }

  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 10, doc.internal.pageSize.height - 15);
    doc.text("Transport Management System", 10, doc.internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
  }

  // Save the PDF
  const filename = startDate && endDate
    ? `Student_Attendance_${startDate}_to_${endDate}.pdf`
    : `Student_Attendance_All_Data.pdf`;
  doc.save(filename);
};

export const exportLeaveRequestsToPDF = (leaveRequests) => {
  const doc = new jsPDF();

  // Add header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("National Engineering College", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("K.R. Nagar, Kovilpatti - 628503, Thoothukudi Dist. Tamilnadu", 105, 30, { align: "center" });
  doc.text("Phone: 04632 - 222502, 230227 | Email: principal@nec.edu.in", 105, 40, { align: "center" });

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Leave Requests Report", 105, 60, { align: "center" });

  let yPosition = 80;

  if (!leaveRequests || leaveRequests.length === 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "italic");
    doc.text("No leave requests found.", 105, yPosition, { align: "center" });
  } else {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    leaveRequests.forEach((request, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`Request ${index + 1}:`, 20, yPosition);
      yPosition += 10;

      doc.setFont("helvetica", "normal");
      const addText = (label, value) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 30, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(value || "N/A", 90, yPosition);
        yPosition += 8;
      };

      addText("Staff Name", request.staffname);
      addText("Staff Code", request.staffcode);
      addText("Reason", request.reason);
      addText("Leave Date", new Date(request.leave_date).toLocaleDateString());
      addText("Submitted At", new Date(request.submitted_at).toLocaleString());
      addText("Vehicle ID", request.vehicleid);
      addText("Status", request.status.charAt(0).toUpperCase() + request.status.slice(1));
      yPosition += 5;
    });
  }

  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 20);
    doc.text("Transport Management System", 20, doc.internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
  }

  // Save the PDF
  doc.save(`Leave_Requests_Report.pdf`);
};

export const exportDriverQueriesToPDF = (driverQueries) => {
  const doc = new jsPDF();

  // Add header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("National Engineering College", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("K.R. Nagar, Kovilpatti - 628503, Thoothukudi Dist. Tamilnadu", 105, 30, { align: "center" });
  doc.text("Phone: 04632 - 222502, 230227 | Email: principal@nec.edu.in", 105, 40, { align: "center" });

  // Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Driver Queries Report", 105, 60, { align: "center" });

  let yPosition = 80;

  if (!driverQueries || driverQueries.length === 0) {
    doc.setFontSize(14);
    doc.setFont("helvetica", "italic");
    doc.text("No driver queries found.", 105, yPosition, { align: "center" });
  } else {
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    driverQueries.forEach((query, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.text(`Query ${index + 1}:`, 20, yPosition);
      yPosition += 10;

      doc.setFont("helvetica", "normal");
      const addText = (label, value) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, 30, yPosition);
        doc.setFont("helvetica", "normal");
        doc.text(value || "N/A", 90, yPosition);
        yPosition += 8;
      };

      addText("Staff Name", query.staffname);
      addText("Staff Code", query.staffcode);
      addText("Query", query.query_text);
      addText("Submitted At", new Date(query.submitted_at).toLocaleString());
      addText("Vehicle ID", query.vehicleid);
      addText("Status", query.status.charAt(0).toUpperCase() + query.status.slice(1));
      yPosition += 5;
    });
  }

  // Add footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, doc.internal.pageSize.height - 20);
    doc.text("Transport Management System", 20, doc.internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
  }

  // Save the PDF
  doc.save(`Driver_Queries_Report.pdf`);
};

export const exportTravellersToPDF = (travellers, filename = "Travellers_Report") => {
  const doc = new jsPDF("landscape");

  // Add header
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("National Engineering College - Transport Management", 148, 15, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("K.R. Nagar, Kovilpatti - 628503 | Phone: 04632 - 222502 | Email: transport@nec.edu.in", 148, 22, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Passenger Allocation & Traveller Roster Report", 148, 32, { align: "center" });

  let yPosition = 45;

  // Table Headers
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setFillColor(37, 99, 235);
  doc.setTextColor(255, 255, 255);
  doc.rect(14, yPosition, 268, 8, "F");

  doc.text("#", 16, yPosition + 6);
  doc.text("Name", 28, yPosition + 6);
  doc.text("Roll / Staff ID", 85, yPosition + 6);
  doc.text("Role", 125, yPosition + 6);
  doc.text("Branch / Year", 150, yPosition + 6);
  doc.text("City", 195, yPosition + 6);
  doc.text("Boarding Stop", 225, yPosition + 6);
  doc.text("Route", 262, yPosition + 6);

  yPosition += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  travellers.forEach((t, idx) => {
    if (yPosition > 190) {
      doc.addPage("landscape");
      yPosition = 20;

      // Re-draw headers
      doc.setFont("helvetica", "bold");
      doc.setFillColor(37, 99, 235);
      doc.setTextColor(255, 255, 255);
      doc.rect(14, yPosition, 268, 8, "F");

      doc.text("#", 16, yPosition + 6);
      doc.text("Name", 28, yPosition + 6);
      doc.text("Roll / Staff ID", 85, yPosition + 6);
      doc.text("Role", 125, yPosition + 6);
      doc.text("Branch / Year", 150, yPosition + 6);
      doc.text("City", 195, yPosition + 6);
      doc.text("Boarding Stop", 225, yPosition + 6);
      doc.text("Route", 262, yPosition + 6);

      yPosition += 12;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
    }

    doc.text(String(idx + 1), 16, yPosition);
    doc.text(String(t.name || "").substring(0, 25), 28, yPosition);
    doc.text(String(t.rollno || ""), 85, yPosition);
    doc.text(String(t.role || "Student"), 125, yPosition);
    doc.text(`${t.branch || ""} (${t.year || ""})`, 150, yPosition);
    doc.text(String(t.city || t.place || ""), 195, yPosition);
    doc.text(String(t.stage_name || t.point || "Campus Gate").substring(0, 18), 225, yPosition);
    doc.text(String(t.routeid || "R001"), 262, yPosition);

    yPosition += 7;
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on: ${new Date().toLocaleString()} | Total Records: ${travellers.length}`, 14, doc.internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
  }

  doc.save(`${filename}.pdf`);
};

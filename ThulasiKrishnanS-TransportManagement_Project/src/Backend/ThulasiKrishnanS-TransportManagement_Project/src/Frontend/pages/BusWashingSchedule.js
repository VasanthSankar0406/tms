import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { FaBus, FaCalendarAlt, FaCheckCircle, FaExclamationTriangle, FaSyncAlt } from "react-icons/fa";
import { API_URL } from "../config";
import "../styles/BusWashingSchedule.css";
import "../styles/BusFeesManagement.css";

const BusWashingSchedule = () => {
  const [schedules, setSchedules] = useState([]);
  const [today, setToday] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingBus, setCompletingBus] = useState("");
  const [toast, setToast] = useState("");

  const fetchSchedules = useCallback(async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data } = await axios.get(`${API_URL}/api/bus-washing`);
      if (data?.success) {
        setSchedules(data.schedules || []);
        if (data.todayDate) setToday(data.todayDate);
      }
    } catch (error) {
      console.error("Error fetching washing schedule:", error);
      setToast(error.response?.data?.message || "Could not load the bus washing schedule.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSchedules(false); }, [fetchSchedules]);

  const dueBuses = schedules.filter((schedule) => schedule.scheduled_date <= today);

  const handleMarkComplete = async (schedule) => {
    setCompletingBus(String(schedule.vehicleid));
    try {
      const { data } = await axios.put(`${API_URL}/api/bus-washing/${schedule.id}`, { status: "Completed" });
      const nextDate = data.record?.next_scheduled_date;
      setToast(`Bus ${schedule.vehicleid} marked washed. Its next wash is scheduled for ${nextDate}.`);
      await fetchSchedules(false);
    } catch (error) {
      console.error("Error completing bus wash:", error);
      setToast(error.response?.data?.message || "Could not mark this bus wash complete.");
    } finally {
      setCompletingBus("");
    }
  };

  const dayCount = (date) => {
    const due = new Date(`${date}T00:00:00`);
    const current = new Date(`${today}T00:00:00`);
    return Math.ceil((due - current) / 86400000);
  };

  return (
    <div className="washing-page-container">
      <header className="washing-header-panel">
        <div>
          <p className="washing-kicker">Fleet washing schedule</p>
          <h1>Bus Washing Schedule</h1>
          <p className="washing-subtitle">
            Each bus is due for a wash every 30 days. The next cycle starts when an admin marks its wash complete.
          </p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => fetchSchedules()} disabled={refreshing}>
          <FaSyncAlt /> {refreshing ? "Refreshing..." : "Refresh schedule"}
        </button>
      </header>

      {toast && <div className="washing-toast" role="status">
        <span>{toast}</span>
        <button type="button" onClick={() => setToast("")} aria-label="Dismiss message">×</button>
      </div>}

      <section className={`washing-reminder ${dueBuses.length ? "washing-reminder-due" : "washing-reminder-clear"}`} aria-live="polite">
        {dueBuses.length ? <FaExclamationTriangle /> : <FaCheckCircle />}
        <div>
          <strong>{dueBuses.length ? `${dueBuses.length} bus${dueBuses.length === 1 ? " is" : "es are"} due for washing` : "No buses are due for washing today"}</strong>
          <p>{dueBuses.length ? "Mark each bus complete after it has been washed. Its next reminder will appear in 30 days." : "Upcoming buses will appear here on their scheduled washing date."}</p>
        </div>
      </section>

      <div className="fees-table-card washing-table-card">
        {loading ? <div className="washing-empty-state">Loading washing schedule...</div> : (
          <div className="table-responsive">
            <table className="fees-table washing-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Bus</th>
                  <th>Route</th>
                  <th>Scheduled Washing Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {schedules.length ? schedules.map((schedule, index) => {
                  const isDue = schedule.scheduled_date <= today;
                  const days = dayCount(schedule.scheduled_date);
                  const isCompleting = completingBus === String(schedule.vehicleid);
                  return <tr key={schedule.id || schedule.vehicleid} className={isDue ? "washing-row-due" : ""}>
                    <td>{index + 1}</td>
                    <td><span className="washing-bus-name"><FaBus /> Bus {schedule.vehicleid}</span><small className="washing-vehicle-id">{schedule.registrationno || "Registration not set"}</small></td>
                    <td>{schedule.routename || "Route not assigned"}</td>
                    <td><span className="washing-date"><FaCalendarAlt /> {schedule.scheduled_date}</span></td>
                    <td>{isDue ? <button type="button" className="washing-complete-button" onClick={() => handleMarkComplete(schedule)} disabled={Boolean(completingBus)}>
                      <FaCheckCircle /> {isCompleting ? "Saving..." : "Mark Complete"}
                    </button> : <span className="washing-days-remaining">Reminder in {days} day{days === 1 ? "" : "s"}</span>}</td>
                  </tr>;
                }) : <tr><td colSpan="5" className="washing-empty-state">No washing schedules were returned. Restart the backend and refresh so it can initialize schedules for the registered buses.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusWashingSchedule;

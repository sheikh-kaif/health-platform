import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import client from "../api/client";
import AmbulanceSidebar from "../components/AmbulanceSidebar";
import ContactAdminForm from "../components/ContactAdminForm";
import { IconAmbulance } from "../components/SidebarIcons";
import { SkeletonCardList } from "../components/Skeleton";
import LiveTrackingMap from "../components/LiveTrackingMap";
import LiveStatusBadge from "../components/LiveStatusBadge";
import { getOrConnectSocket } from "../lib/socket";

const VALID_TABS = ["requests", "trips", "messages"];
const TAB_TITLES = {
  requests: "Ambulance Requests",
  trips: "My Trips",
  messages: "Message the Admin Team",
};

const FALLBACK_POLL_MS = 25000;

const SHARING_KEY = "hp_ambulance_sharing_request_id";

export default function AmbulanceDashboard() {
  const [searchParams] = useSearchParams();
  const tab = VALID_TABS.includes(searchParams.get("tab"))
    ? searchParams.get("tab")
    : "requests";

  const [pending, setPending] = useState([]);
  const [myTrips, setMyTrips] = useState([]);
  const [myTripsLoaded, setMyTripsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [actingId, setActingId] = useState(null);
  const [sharingId, setSharingId] = useState(null);
  const watchIdRef = useRef(null);
  const [myLocation, setMyLocation] = useState(null); // this driver's own last known position
  const [patientLocations, setPatientLocations] = useState({}); // requestId -> { lat, lng, at }

  const loadPending = async () => {
    try {
      const { data } = await client.get("/ambulance/requests", {
        params: { status: "pending" },
      });
      setPending(data.requests);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to load requests");
    }
  };

  const loadMyTrips = async () => {
    try {
      const { data } = await client.get("/ambulance/requests/mine");
      setMyTrips(data.requests);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to load your trips");
    } finally {
      setMyTripsLoaded(true);
    }
  };

  useEffect(() => {
    loadMyTrips();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const load = async () => {
      if (tab === "requests") await loadPending();
      if (tab === "trips") await loadMyTrips();
      if (!cancelled) setLoading(false);
    };
    load();

    let interval;
    if (tab === "requests" || tab === "trips") {
      interval = setInterval(
        tab === "requests" ? loadPending : loadMyTrips,
        FALLBACK_POLL_MS,
      );
    }

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [tab]);

  useEffect(() => {
    const socket = getOrConnectSocket();
    if (!socket) return;

    const onNewRequest = (request) => {
      setPending((prev) =>
        prev.some((r) => r._id === request._id) ? prev : [request, ...prev],
      );
    };
    const onTaken = ({ requestId }) => {
      setPending((prev) => prev.filter((r) => r._id !== requestId));
    };

    socket.on("ambulance:new-request", onNewRequest);
    socket.on("ambulance:request-taken", onTaken);
    return () => {
      socket.off("ambulance:new-request", onNewRequest);
      socket.off("ambulance:request-taken", onTaken);
    };
  }, []);

  useEffect(() => {
    const socket = getOrConnectSocket();
    if (!socket) return;
    const onPatientLocation = (payload) => {
      console.log("[ambulance] received ambulance:patient-location", payload);
      const { requestId, lat, lng, at } = payload;
      setPatientLocations((prev) => ({
        ...prev,
        [requestId]: { lat, lng, at },
      }));
    };
    socket.on("ambulance:patient-location", onPatientLocation);
    return () => socket.off("ambulance:patient-location", onPatientLocation);
  }, []);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation?.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleAccept = async (id) => {
    setActingId(id);
    setMessage(null);
    try {
      await client.patch(`/ambulance/requests/${id}/accept`);
      setMessage(
        "Request accepted — the patient can see your contact details.",
      );
      setPending((prev) => prev.filter((r) => r._id !== id));
      await loadMyTrips();
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Failed to accept — someone else may have taken it first.",
      );
      await loadPending();
    } finally {
      setActingId(null);
    }
  };

  const handleComplete = async (id) => {
    setActingId(id);
    try {
      await client.patch(`/ambulance/requests/${id}/complete`);
      if (sharingId === id) stopSharing();
      await loadMyTrips();
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to mark as completed");
    } finally {
      setActingId(null);
    }
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation?.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharingId(null);
    localStorage.removeItem(SHARING_KEY);
  };

  const startSharing = (request) => {
    if (!navigator.geolocation) {
      setMessage("Live location isn't supported in this browser.");
      return;
    }
    const socket = getOrConnectSocket();
    if (!socket) {
      setMessage("Not connected for live updates — try refreshing the page.");
      return;
    }

    if (watchIdRef.current !== null)
      navigator.geolocation.clearWatch(watchIdRef.current);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(point);
        const patientId = request.patient?._id || request.patient;
        console.log("[ambulance] sending driver:location", {
          requestId: request._id,
          patientId,
          ...point,
        });
        socket.emit("driver:location", {
          requestId: request._id,
          patientId,
          ...point,
        });
      },
      (err) => {
        console.error("[ambulance] geolocation error:", err.message);
        setMessage("Couldn't get your location — check location permissions.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    setSharingId(request._id);
    localStorage.setItem(SHARING_KEY, request._id);
  };

  const inProgress = myTrips.filter((t) => t.status === "accepted");
  const completed = myTrips.filter((t) => t.status === "completed");

  useEffect(() => {
    if (!myTripsLoaded || sharingId) return;
    const savedId = localStorage.getItem(SHARING_KEY);
    if (!savedId) return;
    const stillActive = inProgress.find((r) => r._id === savedId);
    if (stillActive) {
      startSharing(stillActive);
    } else {
      localStorage.removeItem(SHARING_KEY);
    }
  }, [myTripsLoaded, inProgress.length]);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row">
      <AmbulanceSidebar active={tab} />
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold text-ink-900">
          {TAB_TITLES[tab]}
        </h1>

        {message && <p className="mt-4 text-sm text-brand-700">{message}</p>}

        {tab === "requests" && (
          <div className="mt-6 flex flex-col gap-3">
            {inProgress.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-100 px-4 py-3 text-sm text-amber-700">
                You have a trip in progress — finish it (mark it completed on
                the My Trips tab) before you can accept another request.
              </div>
            )}
            {loading ? (
              <SkeletonCardList count={3} />
            ) : pending.length === 0 ? (
              <p className="text-sm text-ink-600">
                No pending requests right now — new bookings will show up here
                automatically.
              </p>
            ) : (
              pending.map((r) => (
                <div
                  key={r._id}
                  className="flex flex-col gap-3 rounded-lg border border-ink-200 bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-coral-100 text-coral-600">
                      <IconAmbulance width={18} height={18} />
                    </span>
                    <div>
                      <p className="font-medium text-ink-900">
                        {r.patient?.user?.name || "Patient"}
                      </p>
                      <p className="text-sm text-ink-600">{r.pickupAddress}</p>
                      <p className="text-xs text-ink-400">
                        Contact: {r.contactPhone}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </p>
                      <p className="text-xs text-ink-400">
                        Requested {new Date(r.createdAt).toLocaleTimeString()}
                      </p>
                      {r.pickupLocation && (
                        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-brand-600">
                          <IconAmbulance width={12} height={12} />
                          Shared their location
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAccept(r._id)}
                    disabled={actingId === r._id || inProgress.length > 0}
                    title={
                      inProgress.length > 0
                        ? "Finish your current trip first"
                        : undefined
                    }
                    className="shrink-0 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {actingId === r._id ? "Accepting…" : "Accept"}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "trips" && (
          <div className="mt-6 flex flex-col gap-6">
            {loading ? (
              <SkeletonCardList count={2} />
            ) : (
              <>
                <div>
                  <h3 className="text-sm font-semibold text-ink-800">
                    In progress
                  </h3>
                  <div className="mt-3 flex flex-col gap-3">
                    {inProgress.length === 0 && (
                      <p className="text-sm text-ink-600">
                        No trips in progress.
                      </p>
                    )}
                    {inProgress.map((r) => (
                      <div
                        key={r._id}
                        className="rounded-lg border border-ink-200 bg-surface p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-ink-900">
                              {r.patient?.user?.name || "Patient"}
                            </p>
                            <p className="text-sm text-ink-600">
                              {r.pickupAddress}
                            </p>
                            <p className="text-xs text-ink-400">
                              Contact: {r.contactPhone}
                            </p>
                            {sharingId === r._id && (
                              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-success-600">
                                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-500" />
                                Sharing your live location
                              </p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-2">
                            {sharingId === r._id ? (
                              <button
                                onClick={stopSharing}
                                className="rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-100"
                              >
                                Stop sharing
                              </button>
                            ) : (
                              <button
                                onClick={() => startSharing(r)}
                                className="rounded-md border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700 hover:bg-brand-100"
                              >
                                Share live location
                              </button>
                            )}
                            <button
                              onClick={() => handleComplete(r._id)}
                              disabled={actingId === r._id}
                              className="rounded-md border border-ink-200 bg-surface px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-60"
                            >
                              {actingId === r._id
                                ? "Saving…"
                                : "Mark completed"}
                            </button>
                          </div>
                        </div>
                        {(sharingId === r._id ||
                          patientLocations[r._id] ||
                          r.pickupLocation) && (
                          <div className="mt-3 flex flex-col gap-2">
                            <LiveStatusBadge />
                            <LiveTrackingMap
                              ambulance={myLocation}
                              destination={
                                patientLocations[r._id] || r.pickupLocation
                              }
                              ambulanceLabel="You"
                              destinationLabel={
                                r.patient?.user?.name || "Patient"
                              }
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ink-800">
                    Completed
                  </h3>
                  <div className="mt-3 flex flex-col gap-3">
                    {completed.length === 0 && (
                      <p className="text-sm text-ink-600">
                        No completed trips yet.
                      </p>
                    )}
                    {completed.map((r) => (
                      <div
                        key={r._id}
                        className="rounded-lg border border-ink-200 bg-surface p-4"
                      >
                        <p className="font-medium text-ink-900">
                          {r.patient?.user?.name || "Patient"}
                        </p>
                        <p className="text-sm text-ink-600">
                          {r.pickupAddress}
                        </p>
                        <p className="text-xs text-ink-400">
                          Completed {new Date(r.completedAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "messages" && (
          <div className="mt-6 max-w-lg rounded-xl border border-ink-200 bg-surface p-5">
            <h3 className="text-sm font-semibold text-ink-800">
              Message the admin team
            </h3>
            <p className="mt-1 text-sm text-ink-600">
              Have a question or issue with your account? Send a message and the
              admin team will reply by email.
            </p>
            <div className="mt-4">
              <ContactAdminForm endpoint="/ambulance/me/contact-admin" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

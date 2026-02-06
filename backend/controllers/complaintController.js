import Complaint from "../models/complaint_model.js";
import Asset from "../models/assets_model.js";

const ok = (res, message, data, status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

const isAdminOrSupervisor = (req) =>
  ["ADMIN", "SUPERVISOR"].includes(req.user?.role);

const isDepartmentUser = (req) => req.user?.role === "DEPARTMENT_USER";
const isSupervisor = (req) => req.user?.role === "SUPERVISOR";
const isViewer = (req) => req.user?.role === "VIEWER";

const ensureDeptAccess = (req, complaint) => {
  if (isDepartmentUser(req)) {
    return complaint.departmentId === req.user.departmentId;
  }
  return true;
};

const appendComplaintHistory = (complaint, entry) => {
  if (!Array.isArray(complaint.history)) complaint.history = [];
  complaint.history.push(entry);
};

const appendAssetHistory = async (assetId, entry) => {
  if (!assetId) return;
  await Asset.updateOne(
    { assetId },
    { $push: { history: entry } }
  );
};

// POST /api/complaints
export const createComplaint = async (req, res) => {
  try {
    const { assetId, type, description, departmentId } = req.body;
    if (!type || !description) {
      return fail(res, "type and description required", 400);
    }

    let deptId = departmentId;
    if (isDepartmentUser(req)) {
      deptId = req.user.departmentId;
    }

    if (!deptId) {
      return fail(res, "departmentId is required", 400);
    }

    const c = new Complaint({
      assetId: assetId || null,
      type,
      description,
      departmentId: deptId,
      createdBy: req.user._id,
      status: "OPEN",
    });

    const performedAt = new Date();
    const createdEntry = {
      action: "Complaint Created",
      message: "Complaint Created",
      performedBy: req.user._id,
      performedAt,
    };
    appendComplaintHistory(c, createdEntry);
    await appendAssetHistory(assetId || null, {
      action: "Complaint filed",
      message: "Complaint filed",
      performedBy: req.user._id,
      performedAt,
    });

    await c.save();
    return ok(res, "Complaint created", c, 201);
  } catch (err) {
    console.error("Error creating complaint", err);
    return fail(res, err.message, 500);
  }
};

// GET /api/complaints?status=OPEN&assetId=...&departmentId=...
export const getComplaints = async (req, res) => {
  try {
    const { status, assetId, departmentId } = req.query;
    const filter = {};

    if (status) {
      const allowedStatuses = ["OPEN", "SUPERVISOR_RESOLVED", "CLOSED"];
      if (!allowedStatuses.includes(status)) {
        return fail(res, "Invalid status filter", 400);
      }
      filter.status = status;
    }
    if (assetId) filter.assetId = assetId;

    if (departmentId) {
      if (!isAdminOrSupervisor(req)) {
        return fail(res, "Forbidden", 403);
      }
      filter.departmentId = departmentId;
    }

    if (isDepartmentUser(req)) {
      filter.departmentId = req.user.departmentId;
    }

    const list = await Complaint.find(filter).sort({ createdAt: -1 });
    return ok(res, "Complaints fetched", list);
  } catch (err) {
    console.error("Error fetching complaints", err);
    return fail(res, err.message, 500);
  }
};

// GET /api/complaints/:id
export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return fail(res, "Complaint not found", 404);
    if (!ensureDeptAccess(req, complaint)) {
      return fail(res, "Forbidden", 403);
    }
    return ok(res, "Complaint fetched", complaint);
  } catch (err) {
    console.error("Error fetching complaint", err);
    return fail(res, err.message, 500);
  }
};

// PATCH /api/complaints/:id/supervisor-resolve
export const supervisorResolveComplaint = async (req, res) => {
  try {
    const { supervisorNote } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return fail(res, "Complaint not found", 404);

    if (complaint.status !== "OPEN") {
      return fail(res, "Invalid status transition", 400);
    }

    complaint.status = "SUPERVISOR_RESOLVED";
    complaint.supervisorResolvedBy = req.user._id;
    complaint.supervisorResolvedAt = new Date();
    complaint.supervisorNote = supervisorNote || null;

    const performedAt = new Date();
    appendComplaintHistory(complaint, {
      action: "Supervisor Resolved",
      message: "Supervisor Resolved",
      performedBy: req.user._id,
      performedAt,
    });
    await appendAssetHistory(complaint.assetId, {
      action: "Supervisor marked resolved",
      message: "Supervisor marked resolved",
      performedBy: req.user._id,
      performedAt,
    });

    await complaint.save();
    return ok(res, "Complaint resolved by supervisor", complaint);
  } catch (err) {
    console.error("Error resolving complaint", err);
    return fail(res, err.message, 500);
  }
};

// PATCH /api/complaints/:id/close
export const closeComplaint = async (req, res) => {
  try {
    const { departmentFeedback } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return fail(res, "Complaint not found", 404);

    if (complaint.status !== "SUPERVISOR_RESOLVED") {
      return fail(res, "Invalid status transition", 400);
    }
    if (isViewer(req)) return fail(res, "Forbidden", 403);
    if (isAdminOrSupervisor(req) && req.user.role === "ADMIN") {
      // allowed
    } else if (isDepartmentUser(req)) {
      if (!ensureDeptAccess(req, complaint)) return fail(res, "Forbidden", 403);
    } else if (isSupervisor(req)) {
      if (String(complaint.createdBy) !== String(req.user._id)) {
        return fail(res, "Forbidden", 403);
      }
    } else {
      return fail(res, "Forbidden", 403);
    }

    complaint.status = "CLOSED";
    complaint.closedBy = req.user._id;
    complaint.closedAt = new Date();
    complaint.departmentFeedback = departmentFeedback || null;

    const performedAt = new Date();
    appendComplaintHistory(complaint, {
      action: "Department Closed",
      message: "Department Closed",
      performedBy: req.user._id,
      performedAt,
    });
    await appendAssetHistory(complaint.assetId, {
      action: "Department accepted and closed",
      message: "Department accepted and closed",
      performedBy: req.user._id,
      performedAt,
    });

    await complaint.save();
    return ok(res, "Complaint closed", complaint);
  } catch (err) {
    console.error("Error closing complaint", err);
    return fail(res, err.message, 500);
  }
};

// PATCH /api/complaints/:id/reopen
export const reopenComplaint = async (req, res) => {
  try {
    const { reopenReason } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return fail(res, "Complaint not found", 404);

    if (complaint.status !== "SUPERVISOR_RESOLVED") {
      return fail(res, "Invalid status transition", 400);
    }
    if (isViewer(req)) return fail(res, "Forbidden", 403);
    if (isAdminOrSupervisor(req) && req.user.role === "ADMIN") {
      // allowed
    } else if (isDepartmentUser(req)) {
      if (!ensureDeptAccess(req, complaint)) return fail(res, "Forbidden", 403);
    } else if (isSupervisor(req)) {
      if (String(complaint.createdBy) !== String(req.user._id)) {
        return fail(res, "Forbidden", 403);
      }
    } else {
      return fail(res, "Forbidden", 403);
    }

    complaint.status = "OPEN";
    complaint.supervisorResolvedBy = null;
    complaint.supervisorResolvedAt = null;
    complaint.supervisorNote = null;
    complaint.reopenedBy = req.user._id;
    complaint.reopenedAt = new Date();
    complaint.reopenReason = reopenReason || null;

    const performedAt = new Date();
    appendComplaintHistory(complaint, {
      action: "Department Reopened",
      message: "Department Reopened",
      performedBy: req.user._id,
      performedAt,
    });
    await appendAssetHistory(complaint.assetId, {
      action: "Department rejected and reopened",
      message: "Department rejected and reopened",
      performedBy: req.user._id,
      performedAt,
    });

    await complaint.save();
    return ok(res, "Complaint reopened", complaint);
  } catch (err) {
    console.error("Error reopening complaint", err);
    return fail(res, err.message, 500);
  }
};

// GET /api/complaints/active/byAsset/:assetId
export const getActiveComplaintByAsset = async (req, res) => {
  try {
    const { assetId } = req.params;
    const complaint = await Complaint.findOne({
      assetId,
      status: { $ne: "CLOSED" },
    }).sort({ createdAt: -1 });

    if (!complaint) {
      return ok(res, "No active complaint", null);
    }

    if (!ensureDeptAccess(req, complaint)) {
      return fail(res, "Forbidden", 403);
    }

    return ok(res, "Active complaint fetched", complaint);
  } catch (err) {
    console.error("Error fetching active complaint", err);
    return fail(res, err.message, 500);
  }
};

import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Company from '@/models/Company';
import { requireAuth } from '@/lib/auth';
import { updateCompanySchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import mongoose from 'mongoose';

// GET /api/companies/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid company ID', 400);
    }

    await dbConnect();

    const company = await Company.findOne({ _id: id, userId: user.id }).lean();
    if (!company) {
      return errorResponse('Company not found', 404);
    }

    return successResponse(company);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/companies/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid company ID', 400);
    }

    const body = await request.json();
    const validated = updateCompanySchema.parse(body);

    await dbConnect();

    const company = await Company.findOneAndUpdate(
      { _id: id, userId: user.id },
      { $set: validated },
      { new: true }
    ).lean();

    if (!company) {
      return errorResponse('Company not found', 404);
    }

    return successResponse(company);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/companies/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(request);
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return errorResponse('Invalid company ID', 400);
    }

    await dbConnect();

    const company = await Company.findOneAndDelete({ _id: id, userId: user.id });
    if (!company) {
      return errorResponse('Company not found', 404);
    }

    return successResponse({ message: 'Company deleted' });
  } catch (error) {
    return handleApiError(error);
  }
}

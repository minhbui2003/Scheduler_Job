import { NextRequest } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Company from '@/models/Company';
import { requireAuth } from '@/lib/auth';
import { createCompanySchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';

// GET /api/companies - List user's companies
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const query: Record<string, unknown> = { userId: user.id };
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const companies = await Company.find(query)
      .sort({ name: 1 })
      .limit(limit)
      .lean();

    return successResponse(companies);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/companies - Create company
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const validated = createCompanySchema.parse(body);

    await dbConnect();

    // Check for duplicate
    const existing = await Company.findOne({
      userId: user.id,
      name: { $regex: `^${validated.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });

    if (existing) {
      return errorResponse('A company with this name already exists', 409);
    }

    const company = await Company.create({
      userId: user.id,
      ...validated,
    });

    return successResponse(company, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

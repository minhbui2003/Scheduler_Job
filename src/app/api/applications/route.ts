import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import Application from '@/models/Application';
import Company from '@/models/Company';
import { requireAuth } from '@/lib/auth';
import { createApplicationSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-utils';
import { createActivity } from '@/services/notification.service';

// GET /api/applications
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const status = searchParams.get('status') || '';
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    const query: Record<string, unknown> = { userId: user.id };

    if (status && status !== 'ALL') {
      query.status = status;
    }

    // Sort options
    let sortObj: Record<string, 1 | -1> = { createdAt: -1 };
    switch (sort) {
      case 'oldest':
        sortObj = { createdAt: 1 };
        break;
      case 'company':
        sortObj = { companyId: 1 };
        break;
      case 'status':
        sortObj = { status: 1, createdAt: -1 };
        break;
    }

    let applications;
    let total;

    if (search) {
      // Need to search by company name, so aggregate
      const pipeline = [
        { $match: { userId: new mongoose.Types.ObjectId(user.id), ...(status && status !== 'ALL' ? { status } : {}) } },
        {
          $lookup: {
            from: 'companies',
            localField: 'companyId',
            foreignField: '_id',
            as: 'company',
          },
        },
        { $unwind: '$company' },
        {
          $match: {
            $or: [
              { 'company.name': { $regex: search, $options: 'i' } },
              { position: { $regex: search, $options: 'i' } },
            ],
          },
        },
        { $sort: sortObj },
        {
          $facet: {
            data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
            total: [{ $count: 'count' }],
          },
        },
      ];

      const result = await Application.aggregate(pipeline);
      applications = result[0]?.data || [];
      total = result[0]?.total?.[0]?.count || 0;
    } else {
      total = await Application.countDocuments(query);
      const rawApplications = await Application.find(query)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

      // Populate company info
      const companyIds = [...new Set(rawApplications.map((a) => a.companyId.toString()))];
      const companies = await Company.find({ _id: { $in: companyIds }, userId: user.id }).lean();
      const companyMap = new Map(companies.map((c) => [c._id.toString(), c]));

      applications = rawApplications.map((app) => ({
        ...app,
        company: companyMap.get(app.companyId.toString()) || null,
      }));
    }

    return successResponse({
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/applications
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const body = await request.json();
    const validated = createApplicationSchema.parse(body);

    await dbConnect();

    let companyId = validated.companyId;

    // If companyName is provided but no companyId, find or create company
    if (!companyId && validated.companyName) {
      const existingCompany = await Company.findOne({
        userId: user.id,
        name: { $regex: `^${validated.companyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      });

      if (existingCompany) {
        companyId = existingCompany._id.toString();
      } else {
        const newCompany = await Company.create({
          userId: user.id,
          name: validated.companyName,
        });
        companyId = newCompany._id.toString();
      }
    }

    if (!companyId) {
      return errorResponse('Company is required', 400);
    }

    // Verify company belongs to user
    const company = await Company.findOne({ _id: companyId, userId: user.id });
    if (!company) {
      return errorResponse('Company not found', 404);
    }

    const application = await Application.create({
      userId: user.id,
      companyId,
      position: validated.position,
      applicationDate: validated.applicationDate ? new Date(validated.applicationDate) : new Date(),
      status: validated.status,
      jdText: validated.jdText,
      requiredDocuments: validated.requiredDocuments || [],
      notes: validated.notes,
    });

    // Create activity
    await createActivity(
      user.id,
      application._id.toString(),
      'APPLICATION_CREATED',
      `Application created for ${validated.position} at ${company.name}`
    );

    return successResponse(
      { ...application.toObject(), company: company.toObject() },
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}

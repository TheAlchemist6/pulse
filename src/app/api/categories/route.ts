import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSubscriptions, channelMetadata, userCategories } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    // Fetch all categories for the user
    const categories = await db
      .select()
      .from(userCategories)
      .where(eq(userCategories.userId, userId))
      .orderBy(userCategories.sortOrder);
    
    // Count channels per category
    const channelCounts = await db
      .select({
        primaryCategory: userSubscriptions.primaryCategory,
        count: userSubscriptions.channelId,
      })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.userId, userId));
    
    const countByCategory = new Map<string, number>();
    for (const c of channelCounts) {
      countByCategory.set(
        c.primaryCategory,
        (countByCategory.get(c.primaryCategory) || 0) + 1
      );
    }
    
    // Build tree structure
    const topLevel = categories.filter(c => !c.parentId);
    const childrenMap = new Map<string | null, typeof categories>();
    
    for (const cat of categories) {
      const parentKey = cat.parentId || null;
      if (!childrenMap.has(parentKey)) {
        childrenMap.set(parentKey, []);
      }
      childrenMap.get(parentKey)!.push(cat);
    }
    
    interface CategoryTreeItem {
      id: string;
      name: string;
      slug: string;
      parentId: string | null;
      sortOrder: number;
      isDefault: boolean;
      channelCount: number;
      createdAt: Date;
      children: CategoryTreeItem[];
    }

    const buildTree = (cats: typeof categories): CategoryTreeItem[] => {
      return cats.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        parentId: cat.parentId,
        sortOrder: cat.sortOrder,
        isDefault: cat.isDefault,
        channelCount: countByCategory.get(cat.name) || 0,
        createdAt: cat.createdAt,
        children: buildTree(childrenMap.get(cat.id) || []),
      }));
    };
    
    const tree = buildTree(topLevel);
    
    return NextResponse.json({ categories: tree });
    
  } catch (error) {
    console.error("GET /categories error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const userId = session.user.id;
  
  try {
    const body = await request.json();
    const { name, parentId } = body;
    
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    
    const slug = slugify(name);
    
    // Get max sort order for this level
    const siblings = await db
      .select({ sortOrder: userCategories.sortOrder })
      .from(userCategories)
      .where(
        parentId
          ? eq(userCategories.parentId, parentId)
          : eq(userCategories.parentId, null as unknown as string)
      )
      .orderBy(userCategories.sortOrder)
      .limit(1);
    
    const sortOrder = siblings.length > 0 ? (siblings[0].sortOrder || 0) + 1 : 0;
    
    // Create category
    const [category] = await db
      .insert(userCategories)
      .values({
        userId,
        name,
        slug,
        parentId: parentId || null,
        sortOrder,
        isDefault: false,
        channelCount: 0,
      })
      .returning();
    
    return NextResponse.json(
      {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          parentId: category.parentId,
          sortOrder: category.sortOrder,
          isDefault: category.isDefault,
          channelCount: category.channelCount,
          children: [],
        },
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error("POST /categories error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create category" },
      { status: 500 }
    );
  }
}

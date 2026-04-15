import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userSubscriptions, channelMetadata, userCategories } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { slugify } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const { id } = await params;
  const userId = session.user.id;
  
  try {
    const body = await request.json();
    const { name, parentId, sortOrder } = body;
    
    // Get current category
    const [current] = await db
      .select()
      .from(userCategories)
      .where(
        and(
          eq(userCategories.userId, userId),
          eq(userCategories.id, id)
        )
      )
      .limit(1);
    
    if (!current) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    
    // Build update values
    const updateValues: Record<string, unknown> = {};
    
    if (name !== undefined) {
      updateValues.name = name;
      updateValues.slug = slugify(name);
    }
    
    if (parentId !== undefined) {
      // Prevent setting self as parent
      if (parentId === id) {
        return NextResponse.json({ error: "Category cannot be its own parent" }, { status: 400 });
      }
      updateValues.parentId = parentId;
    }
    
    if (sortOrder !== undefined) {
      updateValues.sortOrder = sortOrder;
    }
    
    // Update category
    await db
      .update(userCategories)
      .set(updateValues)
      .where(
        and(
          eq(userCategories.userId, userId),
          eq(userCategories.id, id)
        )
      );
    
    // Fetch updated category
    const [updated] = await db
      .select()
      .from(userCategories)
      .where(eq(userCategories.id, id))
      .limit(1);
    
    return NextResponse.json({
      updated: true,
      category: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        parentId: updated.parentId,
        sortOrder: updated.sortOrder,
        isDefault: updated.isDefault,
        channelCount: updated.channelCount,
      },
    });
    
  } catch (error) {
    console.error("PATCH /categories/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  
  const { id } = await params;
  const userId = session.user.id;
  
  try {
    // Get category
    const [category] = await db
      .select()
      .from(userCategories)
      .where(
        and(
          eq(userCategories.userId, userId),
          eq(userCategories.id, id)
        )
      )
      .limit(1);
    
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }
    
    // Check for children
    const children = await db
      .select()
      .from(userCategories)
      .where(eq(userCategories.parentId, id));
    
    if (children.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete category with children. Delete or merge children first." },
        { status: 400 }
      );
    }
    
    // Count channels in this category
    const channelsInCategory = await db
      .select()
      .from(userSubscriptions)
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.primaryCategory, category.name)
        )
      );
    
    const channelsMoved = channelsInCategory.length;
    
    // Move channels to Uncategorized
    if (channelsMoved > 0) {
      await db
        .update(userSubscriptions)
        .set({ primaryCategory: "Uncategorized" })
        .where(
          and(
            eq(userSubscriptions.userId, userId),
            eq(userSubscriptions.primaryCategory, category.name)
          )
        );
    }
    
    // Delete category
    await db
      .delete(userCategories)
      .where(
        and(
          eq(userCategories.userId, userId),
          eq(userCategories.id, id)
        )
      );
    
    return NextResponse.json({ deleted: true, channelsMoved });
    
  } catch (error) {
    console.error("DELETE /categories/[id] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete category" },
      { status: 500 }
    );
  }
}

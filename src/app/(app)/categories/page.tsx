import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui/card";
import { requireUserId } from "@/server/auth/session";
import { listCategoriesWithCounts } from "@/server/budgets";
import { addCategoryAction, deleteCategoryAction, renameCategoryAction } from "./actions";
import { AddCategoryForm, CategoryRow } from "./category-forms";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const userId = await requireUserId();
  const categories = await listCategoriesWithCounts(userId);

  return (
    <>
      <PageHeader
        title="Categories"
        description="Rename them to match your shop. A category with expenses can't be deleted, so no records get lost."
      />
      <Card className="mb-4">
        <AddCategoryForm action={addCategoryAction} />
      </Card>
      <Card className="p-0">
        <ul className="divide-y divide-border">
          {categories.map((c) => (
            <li key={c.id} className="px-4 py-3">
              <CategoryRow
                name={c.name}
                count={c._count.expenses}
                rename={renameCategoryAction.bind(null, c.id)}
                remove={deleteCategoryAction.bind(null, c.id)}
              />
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

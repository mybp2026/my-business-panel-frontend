import { url } from ".";

import type { ApiResponse } from "@/interfaces/api/ApiResponse.interface";
import type { Category } from "@/interfaces/entities/Category.interface";

export const categoryApi = {
  async getAll(): Promise<Category[]> {
    try {
      const response = await fetch(`${url}/category`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const json: ApiResponse<Category[]> = await response.json();
      return json.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al obtener categorías",
      );
    }
  },

  async search(search: string, limit = 100, offset = 0): Promise<Category[]> {
    try {
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      if (search) params.set("search", search);

      const response = await fetch(`${url}/category?${params}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const json: ApiResponse<Category[]> = await response.json();
      return json.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al buscar categorías",
      );
    }
  },

  async getById(categoryId: string): Promise<Category> {
    try {
      const response = await fetch(`${url}/category/${categoryId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      const json: ApiResponse<Category> = await response.json();
      return json.data;
    } catch (error) {
      throw new Error(
        error instanceof Error ? error.message : "Error al obtener categoría",
      );
    }
  },
};

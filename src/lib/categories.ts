export const CATEGORY_MAP: Record<string, string> = {
    food: "🍔 Comida",
    groceries: "🛒 Despensa",
    supermarket: "🏪 Supermercado",
    fuel: "⛽ Gasolina",
    utilities: "⚡ Servicios",
    internet: "📶 Internet",
    streaming: "📺 Streaming",
    chatgpt: "🤖 ChatGPT",
    gym: "🏋️ Gimnasio",
    health: "🏥 Salud",
    education: "📚 Educación",
    other: "📦 Otro",
  };
  
  export function categoryLabel(value?: string | null) {
    return value ? CATEGORY_MAP[value] ?? value : "";
  }

  export const CATEGORIES = [
    { value: "food", label: "🍔 Comida" },
    { value: "groceries", label: "🛒 Despensa" },
    { value: "supermarket", label: "🏪 Supermercado" },
    { value: "fuel", label: "⛽ Gasolina" },
    { value: "utilities", label: "⚡ Servicios" },
    { value: "internet", label: "📶 Internet" },
    { value: "streaming", label: "📺 Streaming" },
    { value: "chatgpt", label: "🤖 ChatGPT" },
    { value: "gym", label: "🏋️ Gimnasio" },
    { value: "health", label: "🏥 Salud" },
    { value: "education", label: "📚 Educación" },
    { value: "other", label: "📦 Otro" },
  ];
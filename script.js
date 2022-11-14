var pushState = function () {

  var selected_ingredients = function () {
    var ingredients = window.location.search.match(/ingredients=(.*)/);
    if (ingredients) {
      ingredients = ingredients[1].split("&")[0];
      return decodeURIComponent(ingredients).split(":");
    }
    return [];
  }();

  var selected_recipe = function () {
    var recipe = window.location.search.match(/recipe=(.*)/);
    if (recipe) {
      recipe = recipe[1].split("&")[0];
      return decodeURIComponent(recipe);
    }
    return false;
  }();

  function ingredients (selected) {
    selected_ingredients = selected.map(function (i) {
      return i.name;
    });
    pushState();
  }

  function recipe (selected) {
    selected_recipe = selected ? selected.key : false;
    pushState();
  }

  function pushState () {
    var pageUrl;
    var pageState = {
      selected_ingredients: selected_ingredients,
      selected_recipe: selected_recipe
    };
    var url_parts = [];

    if (selected_ingredients.length) {
      url_parts.push("ingredients=" + selected_ingredients.join(':'));
    }

    if (selected_recipe) {
      url_parts.push("recipe=" + selected_recipe);
    }

    pageUrl = url_parts.length ? "?" + url_parts.join("&") : "" ;

    window.history.pushState(pageState, "", pageUrl);
  }

  return {
    ingredients: ingredients,
    recipe: recipe,
  };
}();

function values_per_key (pairs, key_name, value_name) {
  return pairs.reduce(function (results, pair) {
    results[pair[key_name]] = results[pair[key_name]] || [];
    results[pair[key_name]].push(pair[value_name]);
    return results;
  }, {});
}

function ingredients_lists(object) {
  return Object.keys(object).map(function (key) {
    return object[key].ingredients;
  });
}

function is_subset (subset) {
  return function (superset) {
    return subset.every(function (i) {
      return superset.some(function (j) {
        return i === j;
      });
    });
  };
}

function concat (a, b) {
  return a.concat(b);
}

function build_box (recipe_ingredients) {
  var ingredients = values_per_key(recipe_ingredients, "ingredient", "r_id");
  var recipes = values_per_key(recipe_ingredients, "r_id", "ingredient");

  var box = {
    ingredients: {},
    recipes: {}
  };

  function createRecipeLiteral (key) {
    return {
      ingredients: [],
      key: key
    };
  }

  Object.keys(ingredients).forEach(function (key) {
    var ingredient = {
      "recipes": [],
      "name": key
    };

    ingredients[key].forEach(function (recipeKey) {
      var recipe = box.recipes[recipeKey] || createRecipeLiteral(recipeKey);

      if (!box.recipes[recipeKey]) {
        box.recipes[recipeKey] = recipe;
      }

      ingredient.recipes.push(recipe);

      box.ingredients[key] = ingredient;
    });
  });

  Object.keys(recipes).forEach(function (key) {
    var recipe = box.recipes[key];

    recipes[key].forEach(function (ingredientKey) {
      recipe.ingredients.push(box.ingredients[ingredientKey]);
    });
  });

  return box;
}

function ingredients_list (box) {
  var selected = [];
  var also_with_selected = [];
  var ul = document.createElement('ul');
  var items;

  function toggle (ingredient) {
    var index = selected.indexOf(ingredient);

    if (index < 0) {
      selected.push(ingredient);
    } else {
      selected.splice(index, 1);
    }

    also_with_selected = ingredients_lists(box.recipes)
      .filter(is_subset(selected))
      .reduce(concat, []);
  }

  function ingredient_class (ingredient) {
    if (!selected.length) {
      return "ingredient";
    }

    if (selected.indexOf(ingredient) > -1) {
      return "ingredient selected";
    }

    if (also_with_selected.indexOf(ingredient) > -1) {
      return "ingredient also_with_selected";
    }

    return "ingredient";
  }

  function render () {
    var any_selected = !!selected.length;
    ul.className = any_selected ? "filtered" : "";
    items.forEach(function (item) {
      var ingredientKey = item.dataset.ingredientKey;
      var ingredient = box.ingredients[ingredientKey];
      item.className = ingredient_class(ingredient);
    });
  }

  function make_item (ingredient) {
    var item = document.createElement('li');
    item.innerHTML = ingredient;
    item.className = "ingredient";
    item.dataset.ingredientKey = ingredient;
    return item;
  }

  function set_selected (selected_ingredients) {
    selected = []; // reset all
    selected_ingredients.forEach(function (name) {
      toggle(box.ingredients[name]);
    });
    broadcast();
  }

  function init_from_query () {
    var ingredients = window.location.search.match(/ingredients=(.*)/);
    if (ingredients) {
      ingredients = ingredients[1].split("&")[0];
      set_selected(decodeURIComponent(ingredients).split(":"));
    }
  }

  function broadcast () {
    var data = { detail: { selected_ingredients: selected } };
    var evt = new CustomEvent('ingredient:selected', data)
    document.dispatchEvent(evt);
  }

  items = Object.keys(box.ingredients).sort().map(make_item);
  items.forEach(function (li) { ul.appendChild(li); });
  document.querySelector('.ingredients_list').appendChild(ul);

  document.addEventListener('ingredient:selected', function (e) {
    render();
  });

  window.addEventListener('popstate', function (e) {
    var selected_ingredients = e.state ? e.state.selected_ingredients : [];
    set_selected(selected_ingredients);
  });

  ul.addEventListener('click', function (e) {
    if (e.target.tagName !== 'LI') return;
    var ingredient = box.ingredients[e.target.dataset.ingredientKey];
    toggle(ingredient);
    pushState.ingredients(selected);
    broadcast();
  });

  init_from_query();
}

function recipes_list (box) {
  var ul = document.createElement('ul');
  var items = [];
  var selected_ingredients = [];
  var selected_recipe = false;
  var template =  '<h1>TITLE</h1>';
      template +=  'RECOMMENDED';
      template += '<div class="ingredients">INGREDIENTS</div>';
  var recommended_template = '<span class="recommended">Tiffany Recommends</span>'

  function toggle (recipe) {
    if (selected_recipe === recipe) {
      selected_recipe = false;
    } else {
      selected_recipe = recipe;
    }
  }

  function recipe_class (recipe) {
    if (recipe === selected_recipe) {
      return "recipe selectable selected";
    }

    if (!selected_ingredients.length) {
      return "recipe";
    }

    if (is_subset(selected_ingredients)(recipe.ingredients)) {
      return "recipe selectable";
    }

    return "recipe";
  }

  function render () {
    var any_selected = !!selected_ingredients.length;
    ul.className = any_selected ? "filtered" : "";
    items.forEach(function (item) {
      var recipeKey = item.dataset.recipeKey;
      var recipe = box.recipes[recipeKey];
      item.className = recipe_class(recipe);
    });
  }

  function make_item (recipeKey) {
    var recipe = box.recipes[recipeKey];
    var item = document.createElement('li');
    var html = template
                .replace(/TITLE/, recipe.title)
                .replace(/RECOMMENDED/, recipe.recommended ? recommended_template : "")
                .replace(/INGREDIENTS/, recipe.ingredients.map(function (i) {
                  return '<span>' + i.name + '</span>';
                }, []).join(' '));
    item.innerHTML = html;
    item.className = recipe_class(recipe);
    item.dataset.recipeKey = recipeKey;
    return item;
  }

  function put_in_box (recipes) {
    Object.keys(recipes).forEach(function (key) {
      var recipe = recipes[key];
      if (box.recipes[key]) {
        box.recipes[key].title = recipe.title;
        box.recipes[key].contents = recipe.contents;
        box.recipes[key].recommended = recipe.recommended;
        box.recipes[key].remark = recipe.remark;
      } else {
        console.log(recipe.title + ' (id ' + recipe.r_id + ') is missing!');
      }
    });
  }

  function display_recipes () {
    items = Object.keys(box.recipes).sort().map(make_item);
    items.forEach(function (li) { ul.appendChild(li); });
    document.querySelector('.recipes_list').appendChild(ul);
  }

  function set_selected (ingredients, recipeKey) {
    selected_ingredients = ingredients.map(function (name) {
      return box.ingredients[name];
    });
    selected_recipe = recipeKey ? box.recipes[recipeKey] : false;
    render();
  }

  function init_from_query () {
    var ingredients = window.location.search.match(/ingredients=(.*)/);
    var recipeKey = window.location.search.match(/recipe=(.*)/);

    if (ingredients) {
      ingredients = ingredients[1].split("&")[0];
      ingredients = decodeURIComponent(ingredients).split(":")
    } else {
      ingredients = [];
    }

    if (recipeKey) {
      recipeKey = recipeKey[1].split("&")[0];
    }

    set_selected(ingredients, recipeKey);
  }

  function prepare_recipes (recipes) {
    put_in_box(recipes);
    recipe_viewer(box);
    display_recipes();
    init_from_query();
  }

  function broadcast () {
    var data = { detail: { selected_recipe: selected_recipe } };
    var evt = new CustomEvent('recipe:selected', data)
    document.dispatchEvent(evt);
  }

  document.addEventListener('ingredient:selected', function (e) {
    selected_ingredients = e.detail.selected_ingredients;
    render();
  });

  document.addEventListener('recipe:selected', function (e) {
    render();
  });

  window.addEventListener('popstate', function (e) {
    var ingredients = e.state ? e.state.selected_ingredients : [];
    var recipeKey = e.state ? e.state.selected_recipe : false;
    set_selected(ingredients, recipeKey);
  });

  ul.addEventListener('click', function (e) {
    var li = e.target;
    while (li.tagName !== 'LI' && li !== ul) {
      li = li.parentElement;
    }
    var recipe = box.recipes[li.dataset.recipeKey];
    toggle(recipe);
    pushState.recipe(selected_recipe);
    broadcast();
  });

  ajax({
    url: "/recipes.json",
    success: prepare_recipes,
    error: function () { console.log(arguments) }
  });
}

function recipe_viewer (box) {
  var template =  '<h1>TITLE</h1>';
      template +=  'RECOMMENDED';
      // template += '<div class="ingredients">INGREDIENTS</div>';
      template += 'REMARK';
      template += '<div class="contents">CONTENTS</div>';
  var recommended_template = '<span class="recommended">Tiffany Recommends</span>'
  var remark_template = '<blockquote class="remark">REMARK</blockquote>';
  var viewer = document.querySelector('.recipe_viewer');
  var recipe = false;

  function render () {
    if (!recipe) {
      document.body.className = "";
      return;
    }
    var html = template
                .replace(/TITLE/, recipe.title)
                .replace(/INGREDIENTS/, recipe.ingredients.map(function (i) {
                  return '<span>' + i.name + '</span>';
                }, []).join(' '))
                .replace(/RECOMMENDED/, recipe.recommended ? recommended_template : "")
                .replace(/REMARK/, recipe.remark ? remark_template.replace(/REMARK/, recipe.remark) : "")
                .replace(/CONTENTS/, recipe.contents);
    viewer.innerHTML = html;
    document.body.className = "viewing_recipe";
  }

  function init_from_query () {
    var recipeKey = window.location.search.match(/recipe=(.*)/);

    if (recipeKey) {
      recipeKey = recipeKey[1].split("&")[0];
      recipe = box.recipes[recipeKey];
      render();
    }
  }

  document.addEventListener('recipe:selected', function (e) {
    recipe = e.detail.selected_recipe;
    render();
  });

  window.addEventListener('popstate', function (e) {
    var recipeKey = e.state ? e.state.selected_recipe : false;
    recipe = recipeKey ? box.recipes[recipeKey] : false;
    render();
  });

  init_from_query();
}

function prepare_ingredients (recipe_ingredients) {
  var box = build_box(recipe_ingredients);
  ingredients_list(box);
  recipes_list(box);
}

ajax({
  url: "/recipe_ingredients.json",
  success: prepare_ingredients,
  error: function () { console.log(arguments) }
});

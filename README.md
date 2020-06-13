# Corvin

Corvin is a programming language, or rather, it's an idea for one. Check out [the wiki](https://github.com/gamesaucer/Corvin/wiki) for more details.

Currently, most of it is just a bunch of brainstorming and little else, and a lot of it will be nonsensical and/or change often until I get a more solid grasp on how I want the language to function.

Ultimately, the goal of this repository is to contain the following resources:

* Documentation for the Corvin language
* A specification for the Corvin language
* A compiler for the Corvin language

I will work on these resources separately until they are viable, meaning that the master branch will remain largely empty for the forseeable future. It's the wiki where most of the activity will happen in these early stages.

## Language Concept

Corvin is an experimental language. There are several problems that most languages tend to sidestep that Corvin aims to tackle head-on. The goal is not to make something that is perfect, but to push boundaries and expose new ideas. These problems serve as pillars to the Corvin language. Each pillar unifies two concepts that, when taken together, tend to cause issues, and attempts to handle the resulting issues in a novel and elegant way.

The syntax used in the examples below isn't final.

### The Circle-Ellipse Problem And Inheritance

The Circle-Ellipse Problem is something I'd consider unsolved as a general concept. There are complications no matter which way you approach the issue. There is no straight-forward way that cuts through all the nonsense, other than throwing out the baby with the bathwater and foregoing inheritance entirely... yet.

In the interest of continuing to think about this problem, I conceived Corvin as a language that offers a novel take on solving this problem by totally changing the way classes are conceptualised. Instead of thinking of an inheritance structure as *defining* relationships, Corvin is aimed to get you to think of these relationships as being *exposed* instead. The inheritance chain is inherently one-directional, but the relationships described are not.

To give an example, a class named `Ellipse` may be intuitively described as a member of a hypothetical superclass `Shape`. However, we can also think of a `Circle`. An ellipse may be a circle as well, but it isn't necessarily. In many cases, you would therefore say that `Circle` is a subclass of `Ellipse`. However, this can become troublesome if you want a circle to be used in all the ways in which an ellipse can. If you're able to stretch the major axis of an ellipse, you should be able to stretch the major axis of a circle. However, a circle does not allow this. We're trying to define a relationship, and that defined relationship does not align with the already existing one.

So, let's take a step back and think this through again. What is, in the simplest possible terms, the relationship between a circle and an ellipse, without having to think about program code or inheritance at all? It's simply this: a circle is an ellipse whose major and minor axis have an identical length.

Instead of concerning ourselves with an inheritance structure, we can simply express this as an assertion. If the assertion holds true, it's a circle. If the assertion does not hold true, it's not a circle.

What we now have is a `Circle` that is a subset of `Ellipse` in the sense that the properties contained within `Ellipse` do not always describe an entity of type `Circle`, whereas the properties in a `Circle` always describe an `Ellipse`.

Now, what if we want to introduce functionality by extending our `Ellipse`? Let's do something silly and make a `BetterEllipse` class that adds some properties and methods. This is not something we can easily specify as a constraint on `Ellipse`; we can say that a certain property or method must exist, but we cannot enforce its semantics. So instead of thinking of it as a subset, we can think of it as a superset: `BetterEllipse` contains all the properties of `Ellipse` and then some, and since there is no constraint on `BetterEllipse`, there is no situation where the properties in an `Ellipse` take on values that would not be allowed in a `BetterEllipse`.

Now, all in all, this means that where we wish to use an `Ellipse`, we can use something like a `Circle` in its place, because it will simply cease being a circle if we try to modify it in a way that is disallowed. Since there is nothing else that differentiates the two, this is easy to use, test for, and/or enforce. Similarly, we can use a `BetterEllipse` in place of an `Ellipse` because there is nothing an `Ellipse` can do that a `BetterEllipse` cannot.

However, now another thing may occur to you, which is the situation in which we may want a `BetterCircle`. Well, fear not, because we already have all we need without having to write *any* more code. With a method similar to union typing, we can simply create something that is *both* a `Circle` *and* a `BetterEllipse`. These things do not preclude each other. In fact, subsets and supersets complement each other well, and supersets will inherit subsets from their parents (or vice versa, depending on your perspective). By writing a subset and a superset, we've *exposed* their relationship in a way we can leverage, without having to *define* anything in terms any more complicated than a simple assertion. As long as this assertion aligns with the existing relationship we're trying to model, we don't need to worry about anything else, and relationships will automatically emerge as we build new functionality, without having to stop and think about it.

### Covariant Parameters And Type-Safety

Covariant parameters on a subclass make the method they're applied on type-unsafe. To illustrate why, imagine an `Animal` and its subclass `Cat`. It is easy to imagine that wherever you use an `Animal`, a `Cat` should suffice, since all cats are animals. However, this may cause problems. Let's create a class called `AnimalShelter` that holds an array of `Animal`, and has a method to add a new `Animal` to the array. Then, let's make a subclass called `CatShelter` that can add a `Cat` to the array instead. Now we can provide a `CatShelter` where an `AnimalShelter` is required, and add, say, a `Dog` to what was a `CatShelter` just a moment ago.

For modelling purposes, you generally want to be able to use any type of animal shelter the same way, but giving up type-safety for this can be a big downside. So instead, this is once again solved with the subset vs. superset distinction in Corvin. By placing an assertion on the `CatShelter` that it only contain cats, we're done. The `CatShelter` simply turns into an `AnimalShelter` should we violate the constraint.

Now, you may be aware of generics, and wonder whether we really have to go through the trouble of making a `CatShelter` subset, a `DogShelter` subset, etc.? To which the answer is no. We can make a subset `Shelter<T of Animal>` and add the assertion that the array contained within only contains `T`. This means that a `Shelter<Dog>` will hold only dogs, and if you try to add a `Cat`, it will simply become a `Shelter<Animal>`, and a `Shelter<Cat>` will hold just cats until you add a `Dog`. All subtypes of `Animal` will be allowed here.

It's even easily possible to define `Shelter<T of Animal>` as a constraint on `AnimalShelter` if it doesn't use generics. As such, you can define your own generic type subset of an existing class without any fuss: `type Shelter<T of Animal> restricts AnimalShelter { assert(shelteredAnimals of T[]) }`. That's all you have to worry about.

You may wonder what happens if you pass an object like `CatShelter` into a function, and it's turned into an `AnimalShelter` inside, while the original variable is of type `CatShelter`. The answer is: nothing. Objects are passed by value, so the original object won't change. If you wish to pass by reference, you must explicitly reassign it first: `AnimalShelter as = cs; &as).add(new Dog())`. Alternatively, you may pass it by value and then cast it back and reassign it: `cs = (CatShelter) cs.add(new Dog())`. The latter will fail, but this is a possibility you explicitly take into account when casting. In many cases, the compiler may even be able to catch the mistake before anything goes wrong, since it sees that you're essentially trying to force a `Dog` into what will go on to become a `CatShelter`. Because of the simplicity with which constraints are defined, this is easy to check for.

## Other Features

There are more features which are central to the language's identity, without being quite as important as the language's pillars. These still exist in the interest of elegance, but aren't a solution to a conflict as much as they are a simplification of certain concepts.

### Tuples and Functions

Parentheses mean tuples; it's as simple as that. Functions take a single argument, and that's a tuple containing their argument list. 1-tuples are automatically structured or destructured as needed. Since expressions wrapped in parentheses resolve to 1-tuples, nested parentheses are automatically destructured since further operations act on the value contained in the 1-tuple rather than the tuple itself. This should largely be able to be resolved at compile-time, but makes parentheses function in a consistent way despite making them do double duty as a type.

### Null

Null sucks. Corvin will use a number of strategies to avoid null values, such as returning a null object, returning an option type, or allowing the caller of a function that may return null to provide their own default value.

### Algebra

Corvin will (hopefully) be able to support algebraic numbers. This means no floating point errors. Instead, Corvin will keep a tree, and update the tree as new operations are made on it. Most operations can be resolved to a single value, but operators and functions that return irrational numbers may cause the tree to expand. Ultimately, algebraic numbers will be approximated and presented as floating-point numbers, but this matters only for presentation.

In the interest of speed, approximations of numbers may be calculated ahead of time so that Corvin programs will not hang if asked for an approximation for a big tree of operations. This behaviour should be able to be adjusted to suit the programmer's goals, so that approximations can be calculated (or not calculated, if presentation as a float isn't necessary) without negatively affecting the rest of the program.

Corvin &copy; 2019-2020 [@gameaucer](https://github.com/gamesaucer)
<concept_spec>

**concept** Categorizing [Fic]

**purpose** to categorize a fanfiction into specific categories (i.e. a fanfic will be categorized into a set of tags). "Categorizing" can also *remove* tags if deemed necessary.

**principle** A user submits their fanfic and the tags the author has already added to the fanfic. It outputs a list of suggested tags (properly categorized) to add to the story and tells the user if any of their author tags should be removed.

**state**

&nbsp;&nbsp;&nbsp;&nbsp; a set of FicCategories with

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; an Fic

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a suggestedTags Category

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a tagsToRemove Category

&nbsp;&nbsp;&nbsp;&nbsp; a Category with

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; a set of Type strings

**actions**

&nbsp;&nbsp;&nbsp;&nbsp; **keywordGenerator** (fic) : (suggestedTags: Category)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** using a LLM, the LLM will examine the fic's ficText's contents, and associates the top 20 most relevant tags (WITHOUT suggesting tags already included in the fic's authorTags) to the content in a suggestedTags Category to the Fic and (if there is not an FicCategory already associated with fic) creates a new FicCategory out of those and adds the FicCategory to the set of FicCategories, or (if there is an FicCategory associated with the fic) adds the suggestedTags to said ficCategory. Finally, it returns the suggestedTags.

&nbsp;&nbsp;&nbsp;&nbsp; **tagCleaner** (fic) : (tagsToRemove: Category)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** using a LLM, the LLM will examine the fic's ficText's contents, then compare it to each authorTag in the foc's set of authorTags. If an authorTag seems inappropriate for the fic, it will add it to a Category of tags to remove. At the very end, if there is already an ficCategory associated with fic, it will add the tagsToRemove Category to the ficCategory. If not, it'll create a new ficCategory and associate the fic and tagsToRemovewith it, and add it to the set of ficCategories. Finally, it returns the tagsToRemove.

&nbsp;&nbsp;&nbsp;&nbsp; **viewFicCategory** (fic) : (ficCategory)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the fic to be associated with an ficCategory in the set of ficCategories

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** runs tagCategorization on each tag in the fic's suggestedTags and tagsToRemove to properly arrange the tags, associates the categories (still in their separate categories of suggestedTags and tagsToRemove) back to the ficCategory then returns the ficCategory.

&nbsp;&nbsp;&nbsp;&nbsp; **deleteFicCategory** (fic) : (ficCategory)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the fic to be associated with an ficCategory in the set of ficCategories

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** removes the ficCategory associated with the fic from the set of FicCategories.


&nbsp;&nbsp;&nbsp;&nbsp; **deleteFicCategories** (ficCats: set of ficCategories)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** all ficCategories to exist within the set of FicCategories.

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** runs deleteFicCategory on all ficCategories in the set of ficCategories.


&nbsp;&nbsp;&nbsp;&nbsp; **viewTagCategory** (tag: String) : (tagCategory)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the tag to be associated with an tagCategory in the set of tagCategories

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** returns the tagCategory associated with the tag.

&nbsp;&nbsp;&nbsp;&nbsp; **deleteTagCategory** (tag: String) : (tagCategory)

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **requires** the tag to be associated with an tagCategory in the set of tagCategories

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; **effect** removes the tagCategory associated with the tag from the set of TagCategories.

</concept_spec>

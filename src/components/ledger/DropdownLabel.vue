<template>
  <div class="dropdown-container">
    <span class="label select" :class="Assets.is_none_field ? 'is-none-field' : null " @click="$emit('toggle')">
      <template v-if="assetsId">
        <span class="priority">{{ Assets.priority_string }}.</span> 
        {{ Assets.label }}
      </template>
      <template v-else>
        <span class="require" v-if="isRequire">미입력</span>
        <span v-else>-</span>
      </template>
    </span>

    <div class="dropdown" v-if="isOpen">
        <input v-model="searchQuery"
            class="search" 
            type="text"/>
        
        <div class="options">
            <button class="option" type="button" @click="changeRecord({id:null, label:'-'})" v-if="!isRequire">-</button>
            <button class="option" type="button" 
                v-for="option in searchOptions" 
                :key="option.id"
                @click="changeRecord(option)"
            >
                <span class="priority">{{ option.priority_string }}</span> 
                {{ option.label }}
            </button>
        </div>
    </div>
  </div>
</template>
<style scoped>
.dropdown {
    position: absolute;
    z-index: 1;
    margin-top: 5px;
    width: 100%;
    background: var(--none-color);
    border-radius: 8px;
    box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.3);
    padding: 8px;
}

.search {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border: 1px solid var(--border-subtle, #ddd);
  border-radius: 6px;
}

.options {
  max-height: 200px;
  overflow-y: scroll;
  overflow-x: hidden;
  margin-top: 6px;
}

.option {
  all: unset;
  display: block;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  word-break: break-word;
}

.option:hover {
  background-color: var(--light-color);
}
span.is-none-field {
  font-size: 0.8em;
  background-color: var(--light-color);
  padding:5px 10px;
  border-radius: 10px;
}
span.require {
  color:var(--none-color);
  font-size: 0.8em;
  background-color: var(--danger-color);
  padding:5px 10px;
  border-radius: 10px;
}

span.priority{
  font-size: 0.7em;
}

/* -------------------- 다크모드 스타일 -------------------- */
:deep([data-theme="dark"]) .dropdown,
[data-theme="dark"] .dropdown {
    background: var(--bg-secondary);
    box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.5);
}

:deep([data-theme="dark"]) .search,
[data-theme="dark"] .search {
    background-color: var(--bg-tertiary);
    border-color: var(--border-color);
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .search::placeholder,
[data-theme="dark"] .search::placeholder {
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) .option,
[data-theme="dark"] .option {
    color: var(--text-primary);
}

:deep([data-theme="dark"]) .option:hover,
[data-theme="dark"] .option:hover {
    background-color: var(--bg-tertiary);
}

:deep([data-theme="dark"]) span.is-none-field,
[data-theme="dark"] span.is-none-field {
    background-color: var(--bg-tertiary);
    color: var(--text-secondary);
}

:deep([data-theme="dark"]) span.require,
[data-theme="dark"] span.require {
    background-color: var(--danger-500);
    color: white;
}

:deep([data-theme="dark"]) span.priority,
[data-theme="dark"] span.priority {
    color: var(--text-secondary);
}
</style>

<script>
export default {
  props: {
    type: {
      type: String,
      required: true
    },
    assetsId: {
      type: String,
      default: null
    },
    assetsList: {
      type: Array,
      required: true
    },
    ledgerRecord: {
      required: true
    },
    
    isOpen: {
      type: Boolean,
      default: false
    },
    isRequire: {
      type: Boolean,
      default: false
    },
    currentMokId: {
      type: String,
      default: null 
    },
  },
  emits: ['toggle', 'updated'],
  
  data() {
    return {
      searchQuery: '',
    }
  },

  watch: {
    currentMokId(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.searchQuery = '';
      }
    }
  },

  computed: {
    Assets() {
        if (!this.assetsId) {
            return { label : "-"};
        }

      let original = this.assetsList.find(assets => assets.id === this.assetsId);
      switch(this.type) {
        case "Hang":
          original.priority_string = this.zeroPad(original.priority, 2)
          break
        case "Mok":
          original.priority_string = this.zeroPad(original.priority, 3)
          break
        case "Saemok":
          original.priority_string = this.zeroPad(original.priority, 4)
          break
      }
      return original
    },

    sortedAndFilteredList() {
      let list = [...this.assetsList];

      list.sort((a, b) => a.priority - b.priority);
      
      if (this.type == "Mok") {
        list = list.filter(asset => {
          return this.ledgerRecord.hang && asset.expand.parent_hang.id === this.ledgerRecord.hang;
        });
      }

      if(this.type == "Saemok"){
        list = list.filter(asset => {
          if(!this.ledgerRecord.mok) return false
          if(!this.ledgerRecord.expand.mok.is_able_specific_saemok) return true
          if(this.ledgerRecord.expand.mok.able_specific_saemok_list.includes(asset.id)) return true
          return false
        })
      }

      list = list.map(asset => {
        switch(this.type) {
          case "Hang":
            asset.priority_string = this.zeroPad(asset.priority, 2)
            break
          case "Mok":
            asset.priority_string = this.zeroPad(asset.priority, 3)
            break
          case "Saemok":
            asset.priority_string = this.zeroPad(asset.priority, 4)
            break
        }
        return asset
      })

      return list;
    },
    searchOptions() {
      const query = this.searchQuery.toLowerCase().trim();
      return this.sortedAndFilteredList.filter(option => 
        option.id !== this.Assets.id && option.label.toLowerCase().includes(query)
      );
    }
  },

  methods: {
    zeroPad(number, desiredLength){
      return String(number).padStart(desiredLength, '0');
    },

    changeRecord(newAssetsValue) {
      this.$emit('updated', newAssetsValue.id);
      this.$emit('toggle');
    }
  },
}
</script>
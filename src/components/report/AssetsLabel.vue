<template>

    <span :class="is_none_field ? 'is-none-field' : ''">
        <span class="priority">{{ Priority }}.</span> 
        {{ Label }}
    </span>
</template>

<script>
export default {
    props: ["assetType", "asset"],

    computed: {
        Priority(){
            switch(this.assetType) {
                case "Hang":
                    return this.zeroPad(this.asset.priority, 2)
                case "Mok":
                    return this.zeroPad(this.asset.priority, 3)
                case "Saemok":
                    return this.zeroPad(this.asset.priority, 4)
                default: 
                    return ''
            }
        },

        is_none_field(){
            if(this.assetType != 'Saemok') return false
            return this.asset.is_none_field
        },

        Label(){
            return this.asset.label
        }

    },
    
    methods: {
        zeroPad(number, desiredLength){
            return String(number).padStart(desiredLength, '0');
        },
    }
}

</script>

<style>
span.priority{
  font-size: 0.7em;
}

span.is-none-field {
    color: var(--medium-color);
}

/* -------------------- 다크모드 스타일 -------------------- */
[data-theme="dark"] span.priority {
    color: var(--text-secondary);
}

[data-theme="dark"] span.is-none-field {
    color: var(--text-secondary);
}
</style>